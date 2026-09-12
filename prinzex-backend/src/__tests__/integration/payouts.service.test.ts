/**
 * Payouts — integration test against the disposable Postgres schema: the
 * seller money-out path end to end. Delivered orders accumulate a pending
 * balance (netOrderEarnings = total − commission − deliveryFee −
 * platformFee); requestPayout locks them into a PAYOUT row; admin approve →
 * mark-paid completes the lifecycle; failPayout releases the locked orders
 * so the balance becomes requestable again.
 *
 * Fixture: APPROVED seller (₹2/page, 10% commission, bank on file) + a
 * customer buying 50-page B&W jobs (₹118 each → ₹106.20 net earnings per
 * delivered order, platform numbers at code defaults).
 */
import mongoose from 'mongoose';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import * as authService from '../../modules/auth/auth.service';
import * as ordersService from '../../modules/orders/orders.service';
import * as payoutsService from '../../modules/payouts/payouts.service';
import * as sellerService from '../../modules/seller/seller.service';
import type { CreateOrderInput } from '../../modules/orders/orders.schema';
import { NotificationModel } from '../../models/mongo/Notification.model';

const ADMIN_META = { adminId: 'integration-test-admin' };
/** Net earnings per delivered 50-page order: 118 − 11.8 commission = 106.2. */
const NET_PER_ORDER = 106.2;

let sellerId: string;
let customerId: string;
let walletId: string;
let addressId: string;
let noBankSellerId: string;
let payoutId: string;

const orderInput = (): CreateOrderInput => ({
  sellerId,
  sellerServiceId: 'doc-print',
  quantity: 1,
  specifications: { paperType: 'bond', size: 'A4', colorOption: 'bw', totalPages: 50 },
  fileUrls: ['/uploads/designs/demo.pdf'],
  deliveryAddressId: addressId,
  deliverySpeed: 'STANDARD',
  paymentMethod: 'wallet',
});

/** Place a (wallet-paid) order and mark it delivered — the payout-eligible state. */
async function deliveredOrder(): Promise<string> {
  const { order } = await ordersService.createOrder(customerId, orderInput());
  await prisma.order.update({ where: { id: order.id }, data: { status: 'delivered' } });
  return order.id;
}

/** Orders needed to cross the configured MIN_PAYOUT_THRESHOLD. */
async function deliverUntilAboveThreshold(): Promise<void> {
  const needed = Math.ceil((env.MIN_PAYOUT_THRESHOLD + 1) / NET_PER_ORDER);
  const existing = await prisma.order.count({
    where: { sellerId, status: 'delivered', payoutId: null },
  });
  for (let i = existing; i < needed; i++) {
    await deliveredOrder();
  }
}

beforeAll(async () => {
  // Payout side effects (notifications, activity log) write to MongoDB.
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/prinzex_test', {
    autoIndex: true,
  });

  // ── Seller with bank details ─────────────────────────────────────────────
  const sellerUser = await prisma.user.create({
    data: {
      name: 'College Street Press',
      email: 'college.street@prinzex.test',
      phone: '+919811556677',
      passwordHash: 'not-used-in-test',
      role: 'SELLER',
      referralCode: 'CSPRESS1',
    },
  });
  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      storeName: 'College Street Press',
      ownerName: 'Arun Ghosh',
      email: 'college.street@prinzex.test',
      phone: '+919811556677',
      businessType: 'PRINT_SHOP',
      storeAddress: 'College Square, Kolkata',
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
  await prisma.sellerService.create({
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
  await prisma.sellerBankDetails.create({
    data: {
      sellerId,
      accountHolderName: 'Arun Ghosh',
      accountNumber: '50100234567890',
      ifscCode: 'HDFC0000123',
      panNumber: 'ABCPG1234K',
    },
  });

  // A second APPROVED seller with NO bank details (request gate test).
  const noBankUser = await prisma.user.create({
    data: {
      name: 'Sealdah Prints',
      email: 'sealdah.prints@prinzex.test',
      phone: '+919811889900',
      passwordHash: 'not-used-in-test',
      role: 'SELLER',
      referralCode: 'SEALDAH1',
    },
  });
  const noBankSeller = await prisma.seller.create({
    data: {
      userId: noBankUser.id,
      storeName: 'Sealdah Prints',
      ownerName: 'Bela Sen',
      email: 'sealdah.prints@prinzex.test',
      phone: '+919811889900',
      businessType: 'PRINT_SHOP',
      storeAddress: 'Sealdah, Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700002',
      openingTime: '09:00',
      closingTime: '21:00',
      status: 'APPROVED',
      commissionRate: 0.1,
    },
  });
  noBankSellerId = noBankSeller.id;

  // ── Customer with a funded wallet ────────────────────────────────────────
  const customer = await authService.register({
    name: 'Tania Bose',
    email: 'tania.bose@prinzex.test',
    phone: '+919876598765',
    password: 'CustomerPass2!',
  });
  customerId = customer.user.id;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: customerId } });
  walletId = wallet.id;
  // Enough for every order this suite places (threshold + headroom).
  await prisma.wallet.update({
    where: { id: walletId },
    data: { balance: Math.max(env.MIN_PAYOUT_THRESHOLD * 4, 2000) },
  });
  const address = await prisma.address.create({
    data: {
      userId: customerId,
      label: 'Home',
      fullAddress: '5 Rashbehari Avenue',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700029',
      phone: '+919876598765',
    },
  });
  addressId = address.id;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => undefined);
  await prisma.$disconnect();
  redis.disconnect();
});

describe('seller payouts (integration — disposable Postgres schema)', () => {
  test('pending balance accumulates only DELIVERED unlocked orders', async () => {
    const before = await sellerService.getPendingBalance(sellerId);
    expect(before.balance).toBe(0);
    expect(before.ordersIncluded).toBe(0);
    expect(before.canRequest).toBe(false); // below threshold with nothing delivered

    await deliveredOrder();
    const after = await sellerService.getPendingBalance(sellerId);
    expect(after.balance).toBe(NET_PER_ORDER); // 118 − 11.8 commission
    expect(after.ordersIncluded).toBe(1);
    expect(after.minThreshold).toBe(env.MIN_PAYOUT_THRESHOLD);
    expect(after.canRequest).toBe(false); // 106.2 < 500
  });

  test('requestPayout requires bank details first', async () => {
    await expect(sellerService.requestPayout(noBankSellerId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('requestPayout below the minimum threshold is rejected (orders stay unlocked)', async () => {
    await expect(sellerService.requestPayout(sellerId)).rejects.toMatchObject({
      statusCode: 400,
    });
    const pending = await sellerService.getPendingBalance(sellerId);
    expect(pending.ordersIncluded).toBe(1); // still requestable, nothing locked
  });

  test('requestPayout locks the delivered orders into a PENDING payout and blocks re-request', async () => {
    await deliverUntilAboveThreshold();
    const pendingBefore = await sellerService.getPendingBalance(sellerId);
    expect(pendingBefore.canRequest).toBe(true);

    const payout = await sellerService.requestPayout(sellerId);
    expect(payout.status).toBe('PENDING');
    expect(payout.ordersIncluded).toBe(pendingBefore.ordersIncluded);
    expect(Number(payout.amount)).toBe(pendingBefore.balance);
    expect(payout.bankAccount).toBe('**********7890'); // masked: 14-char account → 10 stars + last 4

    // Every eligible order is locked to the payout…
    const unlocked = await prisma.order.count({
      where: { sellerId, status: 'delivered', payoutId: null },
    });
    expect(unlocked).toBe(0);

    // …so the pending balance resets and a second request is a 409.
    const pendingAfter = await sellerService.getPendingBalance(sellerId);
    expect(pendingAfter.balance).toBe(0);
    expect(pendingAfter.canRequest).toBe(false);
    expect(pendingAfter.blockedByPayoutId).toBe(payout.id);
    await expect(sellerService.requestPayout(sellerId)).rejects.toMatchObject({
      statusCode: 409,
    });

    // Keep the payout id for the lifecycle tests.
    payoutId = payout.id;
  });

  test('admin lifecycle: approve → PROCESSING, mark-paid → PAID (notifications land)', async () => {
    const approved = await payoutsService.approvePayout(ADMIN_META, payoutId);
    expect(approved.status).toBe('PROCESSING');
    await expect(payoutsService.approvePayout(ADMIN_META, payoutId)).rejects.toMatchObject({
      statusCode: 409, // only PENDING payouts can be approved
    });

    const paid = await payoutsService.markPayoutPaid(ADMIN_META, payoutId, 'UTR-TEST-123');
    expect(paid.status).toBe('PAID');
    expect(paid.transactionRef).toBe('UTR-TEST-123');
    await expect(payoutsService.markPayoutPaid(ADMIN_META, payoutId, 'UTR-X')).rejects.toMatchObject({
      statusCode: 409, // only PROCESSING payouts can be marked paid
    });

    const row = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
    expect(row.status).toBe('PAID');
    expect(row.processedAt).not.toBeNull();

    // The seller heard both transitions (Mongo notifications).
    const processing = await NotificationModel.findOne({
      recipientId: sellerId,
      type: 'payout_processing',
    }).lean();
    expect(processing).not.toBeNull();
    const paidNote = await NotificationModel.findOne({
      recipientId: sellerId,
      type: 'payout_paid',
    }).lean();
    expect(paidNote).not.toBeNull();
  });

  test('a PAID payout can never be failed', async () => {
    await expect(payoutsService.failPayout(ADMIN_META, payoutId, 'oops')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('failPayout releases the locked orders so the balance is requestable again', async () => {
    // Build a fresh requestable balance and lock it into a new payout.
    await deliverUntilAboveThreshold();
    const payout = await sellerService.requestPayout(sellerId);
    expect(payout.status).toBe('PENDING'); // the earlier payout is PAID, not blocking

    const failed = await payoutsService.failPayout(ADMIN_META, payout.id, 'bank rejected');
    expect(failed.status).toBe('FAILED');

    const released = await prisma.order.count({
      where: { sellerId, status: 'delivered', payoutId: null },
    });
    expect(released).toBe(payout.ordersIncluded);

    const pending = await sellerService.getPendingBalance(sellerId);
    expect(pending.balance).toBe(Number(payout.amount));
    expect(pending.canRequest).toBe(true); // money is requestable again

    const failedNote = await NotificationModel.findOne({
      recipientId: sellerId,
      type: 'payout_failed',
    }).lean();
    expect(failedNote).not.toBeNull();
  });
});
