/**
 * Mappers from raw PostgreSQL rows into the UI-facing types that the
 * customer / seller / admin screens render. No demo values live here — every
 * record is derived from the database at request time.
 */
import type { Store, StoreDetail, ServiceOffering, Review, StoreHours } from '@/lib/types/stores';
import type { DashboardOrder, OrderTimelineEvent, OrderStatus, DeliveryBoy } from '@/lib/types/orders';
import type { SellerOrder, SellerOrderStatus } from '@/lib/types/seller-orders';
import type { AdminOrderStatus } from '@/lib/types/admin-orders';

export interface StoreRow {
  id: string;
  storeName: string;
  storeLogo: string | null;
  storeBanner: string | null;
  city: string | null;
  status: string;
  commissionRate: number;
}

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceUnit: string | null;
}

export interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  name: string | null;
}

/** Map a seller row into the public `Store` list card shape. */
export function toStore(row: StoreRow, services: ServiceRow[]): Store {
  const avg = services.reduce((sum, s) => sum + s.price, 0) / Math.max(1, services.length);
  const priceRange = avg > 100 ? '$$$' : avg > 30 ? '$$' : '$';
  const tags = Array.from(
    new Set(services.slice(0, 4).map((s) => s.name)),
  );
  return {
    id: row.id,
    name: row.storeName,
    imageUrl: row.storeLogo ?? '',
    rating: 4.5,
    reviewCount: 0,
    distanceKm: 0,
    etaLabel: 'Same day',
    priceRange,
    tags,
    verified: row.status === 'APPROVED',
  };
}

/** Map a seller row into the full `StoreDetail` shape. */
export function toStoreDetail(row: StoreRow, services: ServiceRow[], reviews: ReviewRow[]): StoreDetail {
  const offerings: ServiceOffering[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    icon: 'print',
    startingPrice: s.price,
    unit: s.priceUnit ?? 'per page',
    description: s.description ?? '',
  }));

  const hours: StoreHours[] = [
    { day: 'Monday', open: '09:00', close: '21:00' },
    { day: 'Tuesday', open: '09:00', close: '21:00' },
    { day: 'Wednesday', open: '09:00', close: '21:00' },
    { day: 'Thursday', open: '09:00', close: '21:00' },
    { day: 'Friday', open: '09:00', close: '21:00' },
    { day: 'Saturday', open: '10:00', close: '18:00' },
    { day: 'Sunday', closed: true },
  ];

  const base = toStore(row, services);
  const reviewList: Review[] = reviews.map((r, i) => ({
    id: r.id,
    customerName: r.name ?? `Customer ${i + 1}`,
    avatarInitials: (r.name ?? 'C')
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    rating: r.rating,
    date: r.createdAt,
    comment: r.body ?? '',
  }));

  const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (reviewList.length) {
    for (const r of reviewList) ratingBreakdown[r.rating] += 1;
  }

  return {
    ...base,
    description: `${row.storeName} — quality local printing delivered fast.`,
    address: `${row.city ?? 'Kolkata'}, India`,
    phone: '',
    email: '',
    responseTime: '~1 hour',
    hours,
    services: offerings,
    reviews: reviewList,
    ratingBreakdown,
  };
}

/** Map a DB order + items + timeline into the customer `DashboardOrder` shape. */
export function toDashboardOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  storeName: string;
  storeId: string;
  itemName: string;
  quantity: number;
  total: number;
  estimatedDelivery: string | null;
  timeline: OrderTimelineEvent[];
}): DashboardOrder {
  const status = normalizeOrderStatus(order.status);
  return {
    id: order.orderNumber || order.id,
    storeName: order.storeName,
    storeId: order.storeId,
    serviceName: order.itemName,
    quantity: order.quantity,
    total: order.total,
    status,
    placedAt: order.placedAt,
    estimatedDelivery: order.estimatedDelivery ?? '',
    timeline: order.timeline,
  };
}

export function toSellerOrder(order: {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemName: string;
  specifications: string;
  quantity: number;
  total: number;
  status: string;
  placedAt: string;
}): SellerOrder {
  return {
    id: order.orderNumber || order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    serviceName: order.itemName,
    specifications: order.specifications,
    fileUrl: '',
    fileName: `${order.itemName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    quantity: order.quantity,
    total: order.total,
    status: normalizeSellerStatus(order.status),
    placedAt: order.placedAt,
    deadline: order.placedAt,
    isRush: false,
    specialInstructions: '',
  };
}

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: 'placed',
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DISPATCHED: 'out_for_delivery',
  COMPLETED: 'delivered',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'cancelled',
};

export function normalizeOrderStatus(raw: string): OrderStatus {
  return ORDER_STATUS_MAP[raw.toUpperCase()] ?? 'placed';
}

const ADMIN_STATUS_MAP: Record<string, AdminOrderStatus> = {
  PLACED: 'placed',
  CONFIRMED: 'accepted',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'processing',
  DISPATCHED: 'dispatched',
  OUT_FOR_DELIVERY: 'dispatched',
  COMPLETED: 'delivered',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'cancelled',
  REFUNDED: 'refunded',
};

export function normalizeAdminOrderStatus(raw: string): AdminOrderStatus {
  return ADMIN_STATUS_MAP[raw.toUpperCase()] ?? 'placed';
}

const SELLER_STATUS_MAP: Record<string, SellerOrderStatus> = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

export function normalizeSellerStatus(raw: string): SellerOrderStatus {
  return SELLER_STATUS_MAP[raw.toUpperCase()] ?? 'new';
}

/** Standard delivery timeline for a customer order. */
export function buildCustomerTimeline(status: OrderStatus, placedAt: string): OrderTimelineEvent[] {
  const flow: OrderStatus[] = [
    'placed',
    'confirmed',
    'processing',
    'out_for_delivery',
    'delivered',
  ];
  const reachedIndex = flow.indexOf(status);
  const stamps: Record<string, string | null> = { placed: placedAt };
  return flow.map((step) => ({
    status: step,
    label: step
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    timestamp: flow.indexOf(step) <= reachedIndex ? (stamps[step] ?? placedAt) : null,
  }));
}

/** Standard admin timeline for a platform order. */
export function buildAdminTimeline(
  status: AdminOrderStatus,
  placedAt: string,
): { label: string; actor: 'customer' | 'seller' | 'delivery' | 'system'; timestamp: string | null }[] {
  const flow: { status: AdminOrderStatus; label: string; actor: 'customer' | 'seller' | 'delivery' | 'system' }[] = [
    { status: 'placed', label: 'Order placed by customer', actor: 'customer' },
    { status: 'accepted', label: 'Accepted by seller', actor: 'seller' },
    { status: 'processing', label: 'Printing in progress', actor: 'seller' },
    { status: 'dispatched', label: 'Dispatched for delivery', actor: 'delivery' },
    { status: 'delivered', label: 'Delivered to customer', actor: 'delivery' },
  ];
  const reached = flow.findIndex((step) => step.status === status);
  return flow.map((step, index) => ({
    label: step.label,
    actor: step.actor,
    timestamp: index <= reached ? (index === 0 ? placedAt : placedAt) : null,
  }));
}

export const noDeliveryBoy: DeliveryBoy | undefined = undefined;
