/* eslint-disable no-console */
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';
import { OrderTimelineModel, type IOrderTimelineEvent } from '../src/models/mongo/Order.model';
import { TrackingModel, type ILocationPoint } from '../src/models/mongo/Tracking.model';
import { NotificationModel } from '../src/models/mongo/Notification.model';
import { ActivityLogModel } from '../src/models/mongo/ActivityLog.model';
import { ContentModel } from '../src/models/mongo/Content.model';

/**
 * MongoDB seed — run with `npm run db:seed:mongo` (AFTER `npm run db:seed`,
 * since every document references PostgreSQL rows).
 *
 *   1. Order timeline documents for each PostgreSQL order (matching statuses)
 *   2. Tracking documents for the out_for_delivery orders
 *   3. 10 notifications for each customer
 *   4. 5 activity log entries
 *   5. 3 banners + 8 FAQs as Content documents
 */

const prisma = new PrismaClient();

const STATUS_FLOW = [
  'placed',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
] as const;

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order placed',
  confirmed: 'Order confirmed by store',
  processing: 'Printing in progress',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Order cancelled',
};

function buildTimeline(order: {
  id: string;
  status: string;
  createdAt: Date;
  cancelledAt: Date | null;
  delivery: { deliveredAt: Date | null } | null;
}): IOrderTimelineEvent[] {
  if (order.status === 'cancelled') {
    return [
      {
        status: 'placed',
        label: STATUS_LABELS.placed,
        timestamp: order.createdAt,
        updatedBy: 'system',
      },
      {
        status: 'cancelled',
        label: STATUS_LABELS.cancelled,
        timestamp: order.cancelledAt ?? order.createdAt,
        note: 'Cancelled by customer',
        updatedBy: 'system',
      },
    ];
  }

  const statusIndex = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
  const events: IOrderTimelineEvent[] = [];
  for (let i = 0; i <= statusIndex; i += 1) {
    const status = STATUS_FLOW[i];
    events.push({
      status,
      label: STATUS_LABELS[status],
      // 20 minutes between lifecycle steps, except the final one which uses
      // the real delivery timestamp when available.
      timestamp:
        status === 'delivered' && order.delivery?.deliveredAt
          ? order.delivery.deliveredAt
          : new Date(order.createdAt.getTime() + i * 20 * 60 * 1000),
      updatedBy: i === 0 ? 'system' : 'seller',
    });
  }
  return events;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('Seeding MongoDB…');
  await mongoose.connect(env.MONGODB_URI, { autoIndex: true });

  // Wipe previously seeded collections.
  await Promise.all([
    OrderTimelineModel.deleteMany({}),
    TrackingModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ActivityLogModel.deleteMany({}),
    ContentModel.deleteMany({}),
  ]);

  const [orders, customers, admin] = await Promise.all([
    prisma.order.findMany({ include: { delivery: true }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ where: { role: 'CUSTOMER' } }),
    prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN' } }),
  ]);

  if (!admin) throw new Error('No super admin found — run `npm run db:seed` first.');

  // 1. Order timelines ──────────────────────────────────────────────────────
  console.log(`… creating order timeline documents for ${orders.length} orders`);
  await OrderTimelineModel.insertMany(
    orders.map((order) => ({
      orderId: order.id,
      timeline: buildTimeline(order),
      adminNotes:
        order.status === 'cancelled'
          ? [
              {
                note: 'Refund issued to original payment method (Razorpay).',
                adminId: admin.id,
                createdAt: new Date(),
              },
            ]
          : [],
      disputeDetails: { isDisputed: false },
    })),
  );

  // 2. Tracking for out_for_delivery orders ─────────────────────────────────
  const outForDelivery = orders.filter((o) => o.status === 'out_for_delivery' && o.delivery);
  console.log(`… creating tracking documents for ${outForDelivery.length} live deliveries`);

  // GPS breadcrumb trail through south Bengaluru.
  const breadcrumbs: Array<Pick<ILocationPoint, 'lat' | 'lng'>> = [
    { lat: 12.9352, lng: 77.6245 },
    { lat: 12.9291, lng: 77.6298 },
    { lat: 12.9227, lng: 77.6351 },
    { lat: 12.9163, lng: 77.6404 },
  ];

  await TrackingModel.insertMany(
    outForDelivery.map((order, index) => {
      const delivery = order.delivery!;
      const history: ILocationPoint[] = breadcrumbs.map((point, step) => ({
        ...point,
        timestamp: new Date(Date.now() - (breadcrumbs.length - step) * 3 * 60 * 1000),
        accuracy: 8,
        speed: 28,
        batteryLevel: 76 - step * 2,
        coordinates: [point.lng, point.lat], // [lng, lat] for the 2dsphere index
      }));
      const current = history[history.length - 1];
      return {
        deliveryId: delivery.id,
        deliveryBoyId: delivery.deliveryBoyId ?? undefined,
        orderId: order.id,
        locationHistory: history,
        currentLocation: current,
        etaMinutes: 12 + index * 4,
      };
    }),
  );

  // 3. Notifications — 10 per customer ──────────────────────────────────────
  console.log(`… creating notifications for ${customers.length} customers`);
  const notificationTemplate: Array<{
    type: string;
    title: string;
    body: string;
    channel: string[];
  }> = [
    { type: 'order_update', title: 'Order confirmed', body: 'Your print order has been confirmed by the store.', channel: ['push'] },
    { type: 'order_update', title: 'Printing in progress', body: 'The store has started printing your documents.', channel: ['push'] },
    { type: 'order_update', title: 'Out for delivery', body: 'Your prints are on the way to your address.', channel: ['push', 'sms'] },
    { type: 'order_update', title: 'Delivered', body: 'Your order was delivered. Enjoy your prints!', channel: ['push'] },
    { type: 'promo', title: '10% off your next order', body: 'Use code WELCOME10 on orders above ₹199.', channel: ['push', 'email'] },
    { type: 'promo', title: 'Weekend rush special', body: 'Same-day delivery at no extra rush fee this weekend.', channel: ['push'] },
    { type: 'payout', title: 'Cashback credited', body: '₹25 welcome cashback added to your PrinZex wallet.', channel: ['push'] },
    { type: 'review_reply', title: 'Store replied to your review', body: 'PrintHub Studios replied: "Thank you for the feedback!"', channel: ['push'] },
    { type: 'order_update', title: 'Rate your order', body: 'How was your recent order? Tap to rate.', channel: ['push'] },
    { type: 'promo', title: 'Refer & earn', body: 'Share PrinZex with friends and earn wallet credits.', channel: ['email'] },
  ];

  const notifications = customers.flatMap((customer, customerIndex) =>
    notificationTemplate.map((template, templateIndex) => ({
      recipientId: customer.id,
      recipientType: 'customer' as const,
      type: template.type,
      title: template.title,
      body: template.body,
      data: orders[customerIndex % orders.length]
        ? { orderId: orders[customerIndex % orders.length].id }
        : {},
      isRead: templateIndex % 3 === 0,
      readAt: templateIndex % 3 === 0 ? new Date() : undefined,
      channel: template.channel,
    })),
  );
  await NotificationModel.insertMany(notifications);

  // 4. Activity logs ────────────────────────────────────────────────────────
  console.log('… creating 5 admin activity log entries');
  const sellers = await prisma.seller.findMany({ orderBy: { createdAt: 'asc' } });
  await ActivityLogModel.insertMany([
    {
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action: 'seller.approved',
      entityType: 'seller',
      entityId: sellers[0]?.id,
      metadata: { storeName: sellers[0]?.storeName },
      ipAddress: '10.0.0.11',
      userAgent: 'PrinZexAdmin/1.0',
    },
    {
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action: 'seller.document_verified',
      entityType: 'seller',
      entityId: sellers[1]?.id,
      metadata: { docType: 'gst_certificate' },
      ipAddress: '10.0.0.11',
      userAgent: 'PrinZexAdmin/1.0',
    },
    {
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action: 'order.cancelled',
      entityType: 'order',
      entityId: orders.find((o) => o.status === 'cancelled')?.id,
      metadata: { refundIssued: true },
      ipAddress: '10.0.0.12',
      userAgent: 'PrinZexAdmin/1.0',
    },
    {
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action: 'coupon.created',
      entityType: 'coupon',
      entityId: 'WELCOME10',
      metadata: { discountType: 'percentage', discountValue: 10 },
      ipAddress: '10.0.0.12',
      userAgent: 'PrinZexAdmin/1.0',
    },
    {
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action: 'payout.processed',
      entityType: 'payout',
      entityId: 'seed-payout-001',
      metadata: { amount: 12450.0, recipientType: 'seller' },
      ipAddress: '10.0.0.13',
      userAgent: 'PrinZexAdmin/1.0',
    },
  ]);

  // 5. Content — 3 banners + 8 FAQs ─────────────────────────────────────────
  console.log('… creating CMS content (3 banners, 8 FAQs)');
  const now = new Date();
  await ContentModel.insertMany([
    {
      type: 'banner',
      title: 'Festive Printing Sale',
      slug: 'banner-festive-sale',
      imageUrl: 'https://cdn.prinzex.com/banners/festive-sale.jpg',
      linkUrl: '/offers/festive',
      order: 1,
      isActive: true,
      publishedAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
      metadata: { ctaLabel: 'Shop now', backgroundColor: '#1a1a2e' },
    },
    {
      type: 'banner',
      title: 'Same-Day Delivery in Bengaluru',
      slug: 'banner-same-day',
      imageUrl: 'https://cdn.prinzex.com/banners/same-day.jpg',
      linkUrl: '/delivery/same-day',
      order: 2,
      isActive: true,
      publishedAt: now,
      createdBy: admin.id,
      metadata: { ctaLabel: 'Order by 2 PM' },
    },
    {
      type: 'banner',
      title: 'Bulk Printing for Businesses',
      slug: 'banner-bulk-printing',
      imageUrl: 'https://cdn.prinzex.com/banners/bulk.jpg',
      linkUrl: '/business',
      order: 3,
      isActive: true,
      publishedAt: now,
      createdBy: admin.id,
      metadata: { ctaLabel: 'Get a quote' },
    },
    ...(
      [
        ['What printing services does PrinZex offer?', 'From A4 document prints to large-format banners, passport photos, business cards and custom invitations — all printed by verified local stores near you.', 'Orders'],
        ['How do I place an order?', 'Pick a nearby store, choose a service, upload your file, select paper and finishing options, pay online (or COD) and choose delivery speed.', 'Orders'],
        ['Can I track my order in real time?', 'Yes — once your order is out for delivery you can watch the delivery partner on a live map with a continuously updated ETA.', 'Delivery'],
        ['What are the delivery options?', 'Standard (up to 48h), Express (12h), Same-Day (6h) and store Pickup. Rush orders carry a small rush fee.', 'Delivery'],
        ['Which payment methods are supported?', 'Razorpay (UPI/cards/netbanking), PrinZex wallet balance and cash on delivery for eligible orders.', 'Payments'],
        ['How do refunds work for cancelled orders?', 'Refunds go back to the original payment method within 3–5 business days, or instantly to your PrinZex wallet if you choose.', 'Payments'],
        ['How do coupons work?', 'Apply a coupon code at checkout. One coupon per order; percentage coupons have a maximum discount cap.', 'Orders'],
        ['How do I become a PrinZex print partner?', 'Register with your store details, upload KYC documents (GST, licence, owner ID) and wait for admin verification — usually under 48 hours.', 'Sellers'],
      ] as Array<[string, string, string]>
    ).map(([title, body, category], index) => ({
      type: 'faq' as const,
      title,
      body,
      slug: `faq-${index + 1}`,
      category,
      order: index + 1,
      isActive: true,
      publishedAt: now,
      createdBy: admin.id,
    })),
  ]);

  const counts = await Promise.all([
    OrderTimelineModel.countDocuments(),
    TrackingModel.countDocuments(),
    NotificationModel.countDocuments(),
    ActivityLogModel.countDocuments(),
    ContentModel.countDocuments(),
  ]);
  console.log('✔ MongoDB seed complete:');
  console.log(
    `   orderTimelines=${counts[0]} tracking=${counts[1]} notifications=${counts[2]} activityLogs=${counts[3]} content=${counts[4]}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('MongoDB seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void mongoose.disconnect();
    void prisma.$disconnect();
  });
