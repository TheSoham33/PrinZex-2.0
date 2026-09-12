/**
 * Order placement — integration test against the disposable Postgres schema
 * (plus Mongo for the post-commit timeline/notification side effects and
 * Redis for the quote cache): the full money path the docs call the heart of
 * the flow — server-side re-quote, wallet debit + ledger row in one
 * transaction, wallet/gateway split, timeline + seller notification.
 *
 * Fixture: one APPROVED seller (₹2/page B&W, ₹4/page colour, 10% commission)
 * offering doc-print; one customer with wallet + address. No settings doc
 * exists, so platform numbers are the code defaults (GST 18%, STANDARD
 * delivery ₹0, platform fee off).
 *
 *   10 pages B&W  → subtotal 20.00 + GST 3.60 = total 23.60
 *   50 pages B&W  → subtotal 100.00 + GST 18.00 = total 118.00
 */
import mongoose from 'mongoose';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import * as authService from '../../modules/auth/auth.service';
import * as ordersService from '../../modules/orders/orders.service';
import type { CreateOrderInput, QuoteBody } from '../../modules/orders/orders.schema';
import { OrderTimelineModel } from '../../models/mongo/Order.model';
import { NotificationModel } from '../../models/mongo/Notification.model';

const baseSpecs = {
  paperType: 'bond',
  size: 'A4',
  colorOption: 'bw' as const,
  totalPages: 10,
};

let sellerId: string;
let serviceId: string;
let customerId: string;
let walletId: string;
let addressId: string;

/** Credit the wallet and keep the ledger honest (top-up row per credit). */
async function topUp(amount: number): Promise<void> {
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } }),
    prisma.transaction.create({
      data: {
        walletId,
        type: 'CREDIT',
        reason: 'WALLET_TOPUP',
        amount,
        description: 'integration-test top up',
      },
    }),
  ]);
}

const orderInput = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  sellerId,
  sellerServiceId: 'doc-print',
  quantity: 1,
  specifications: { ...baseSpecs },
  fileUrls: ['/uploads/designs/demo.pdf'],
  deliveryAddressId: addressId,
  deliverySpeed: 'STANDARD',
  paymentMethod: 'wallet',
  ...over,
});

beforeAll(async () => {
  // The order flow's post-commit side effects (timeline, notification) write
  // to MongoDB — connect it for real so the assertions can see them (and the
  // effects don't stall on mongoose's command buffer).
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/prinzex_test', {
    autoIndex: true,
  });

  // ── Fixtures: seller user → APPROVED store → doc-print service ──────────
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Print Hub Studios',
      email: 'print.hub@prinzex.test',
      phone: '+919811223344',
      passwordHash: 'not-used-in-test',
      role: 'SELLER',
      referralCode: 'PRINTHUB1',
    },
  });
  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      storeName: 'Print Hub Studios',
      ownerName: 'Ravi Das',
      email: 'print.hub@prinzex.test',
      phone: '+919811223344',
      businessType: 'PRINT_SHOP',
      storeAddress: 'College Street, Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700012',
      openingTime: '09:00',
      closingTime: '21:00',
      status: 'APPROVED',
      commissionRate: 0.1,
      metadata: { pricingOverrides: { pageRate: { bw: 2, color: 4 } } },
    },
  });
  sellerId = seller.id;
  const service = await prisma.sellerService.create({
    data: {
      sellerId,
      categoryId: 'documents',
      categoryName: 'Document Printing',
      serviceId: 'doc-print',
      serviceName: 'Document Printing',
      basePrice: 2,
      unit: 'per page',
    },
  });
  serviceId = service.id;

  // ── Customer (real register: wallet + hashed password + referral) ───────
  const customer = await authService.register({
    name: 'Biplob Roy',
    email: 'biplob.roy@prinzex.test',
    phone: '+919876501234',
    password: 'CustomerPass1!',
  });
  customerId = customer.user.id;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: customerId } });
  walletId = wallet.id;

  const address = await prisma.address.create({
    data: {
      userId: customerId,
      label: 'Home',
      fullAddress: '12 Bidhan Sarani, Shyam Bazar',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700006',
      phone: '+919876501234',
    },
  });
  addressId = address.id;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => undefined);
  await prisma.$disconnect();
  redis.disconnect();
});

describe('createQuote (integration — server recomputes the authoritative price)', () => {
  test('quotes the seller page rate with GST and default platform numbers', async () => {
    const body: QuoteBody = {
      sellerId,
      sellerServiceId: 'doc-print',
      quantity: 1,
      specifications: { ...baseSpecs },
      deliverySpeed: 'STANDARD',
    };
    const quote = await ordersService.createQuote(customerId, body);
    expect(quote.subtotal).toBe(20); // 10 pages × ₹2
    expect(quote.tax).toBe(3.6); // 18% GST
    expect(quote.deliveryFee).toBe(0); // STANDARD default
    expect(quote.platformFee).toBe(0); // fee off without a settings doc
    expect(quote.total).toBe(23.6);
    expect(quote.estimatedDeliveryDate).toBeTruthy();
  });
});

describe('createOrder (integration — wallet money path)', () => {
  test('full wallet payment: atomic debit + ledger row + timeline + seller notification', async () => {
    await topUp(100);

    const { order, estimatedDelivery } = await ordersService.createOrder(customerId, orderInput());

    // Order row — the authoritative server-side numbers.
    expect(order.status).toBe('placed');
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentMethod).toBe('wallet');
    expect(Number(order.total)).toBe(23.6);
    expect(Number(order.subtotal)).toBe(20);
    expect(Number(order.tax)).toBe(3.6);
    expect(Number(order.deliveryFee)).toBe(0);
    expect(Number(order.walletAmount)).toBe(23.6);
    expect(Number(order.platformFee)).toBe(0);
    expect(Number(order.commissionAmount)).toBe(2); // 10% of subtotal
    expect(order.isRush).toBe(false); // STANDARD
    expect(estimatedDelivery.getTime()).toBeGreaterThan(Date.now() - 1000);

    // Item row carries the specs and every attached file.
    expect(order.items).toHaveLength(1);
    const item = order.items[0];
    expect(item.sellerServiceId).toBe(serviceId);
    expect(item.fileUrls).toEqual(['/uploads/designs/demo.pdf']);
    expect((item.specifications as { totalPages?: number }).totalPages).toBe(10);

    // Wallet debited to the paisa, with a matching DEBIT ledger row.
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(Number(wallet.balance)).toBe(76.4);
    const debit = await prisma.transaction.findFirst({
      where: { walletId, type: 'DEBIT', reason: 'ORDER_PAYMENT', referenceId: order.id },
    });
    expect(debit).not.toBeNull();
    expect(Number(debit?.amount)).toBe(23.6);

    // Post-commit side effects landed: Mongo timeline + seller notification
    // (paid orders notify the seller at placement, not at capture).
    const timeline = await OrderTimelineModel.findOne({ orderId: order.id }).lean();
    expect(timeline?.timeline?.[0]?.status).toBe('placed');
    const notification = await NotificationModel.findOne({
      recipientId: sellerId,
      type: 'new_order',
    }).lean();
    expect(notification).not.toBeNull();
  });

  test('wallet payment below the total is rejected with 400 (nothing debited)', async () => {
    const before = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    await expect(
      ordersService.createOrder(
        customerId,
        orderInput({ specifications: { ...baseSpecs, totalPages: 50 } }), // ₹118 > balance
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    const after = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(Number(after.balance)).toBe(Number(before.balance)); // untouched
  });

  test('partial wallet on upi: wallet settles its balance, gateway owes the rest, seller not notified yet', async () => {
    const notificationsBefore = await NotificationModel.countDocuments({
      recipientId: sellerId,
      type: 'new_order',
    });

    // Balance 76.4 vs total 118 → wallet pays 76.4, gateway owes 41.6.
    // (Also the exact-equality regression for the guarded debit: the wallet's
    // whole balance is taken — min(76.4, coverableMax) — which the old
    // double-based gte filter silently failed to match.)
    const { order } = await ordersService.createOrder(
      customerId,
      orderInput({
        specifications: { ...baseSpecs, totalPages: 50 },
        paymentMethod: 'upi',
        useWallet: true,
      }),
    );

    expect(order.paymentStatus).toBe('pending'); // gateway capture still owed
    expect(order.paymentMethod).toBe('upi');
    expect(Number(order.walletAmount)).toBe(76.4);
    expect(Number(order.total)).toBe(118);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(Number(wallet.balance)).toBe(0);

    // Gateway-pending orders notify the seller at payment capture, not now.
    expect(
      await NotificationModel.countDocuments({ recipientId: sellerId, type: 'new_order' }),
    ).toBe(notificationsBefore);
  });

  test('full wallet payment succeeds when the balance exactly equals the total', async () => {
    // Regression: the guarded debit compared a JS double against the NUMERIC
    // balance — at exact equality the double's binary-expansion epsilon made
    // `gte` false, so a wallet holding EXACTLY the order total was rejected
    // with "Insufficient wallet balance — need ₹X, have ₹X" (and partial
    // wallet orders silently skipped the wallet debit).
    await topUp(23.6); // balance 0 after the partial test → exactly ₹23.60

    const { order } = await ordersService.createOrder(customerId, orderInput());
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentMethod).toBe('wallet');
    expect(Number(order.walletAmount)).toBe(23.6);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(Number(wallet.balance)).toBe(0);
  });

  test("another customer's delivery address is rejected with 404", async () => {
    const stranger = await authService.register({
      name: 'Stranger Sen',
      email: 'stranger.sen@prinzex.test',
      phone: '+919832104567',
      password: 'StrangerPass1!',
    });
    const strangerAddress = await prisma.address.create({
      data: {
        userId: stranger.user.id,
        label: 'Office',
        fullAddress: 'Salt Lake Sector V',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700091',
        phone: '+919832104567',
      },
    });
    await expect(
      ordersService.createOrder(customerId, orderInput({ deliveryAddressId: strangerAddress.id })),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
