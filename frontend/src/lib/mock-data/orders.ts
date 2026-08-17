/** Dashboard order domain types + mock order records. */

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  /** null = step not reached yet. */
  timestamp: string | null;
}

export interface DeliveryBoy {
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
  lat: number;
  lng: number;
}

export interface DashboardOrder {
  id: string;
  storeName: string;
  storeId: string;
  serviceName: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  estimatedDelivery: string;
  timeline: OrderTimelineEvent[];
  deliveryBoy?: DeliveryBoy;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Tailwind classes per status, matching the palette in the project docs. */
export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  placed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  processing: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ready_for_pickup: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  out_for_delivery: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  delivered: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

export const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  placed: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  processing: 'bg-amber-500',
  ready_for_pickup: 'bg-purple-500',
  out_for_delivery: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const TERMINAL: OrderStatus[] = ['delivered', 'cancelled'];

export const isActiveOrder = (order: DashboardOrder) => !TERMINAL.includes(order.status);

/** Build a standard delivery timeline, marking steps up to `reached` complete. */
function buildTimeline(
  reached: OrderStatus,
  stamps: Partial<Record<OrderStatus, string>>,
): OrderTimelineEvent[] {
  const flow: OrderStatus[] = [
    'placed',
    'confirmed',
    'processing',
    'out_for_delivery',
    'delivered',
  ];
  const reachedIndex = flow.indexOf(reached);
  return flow.map((status, index) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    timestamp: index <= reachedIndex ? (stamps[status] ?? null) : null,
  }));
}

export const MOCK_ORDERS: DashboardOrder[] = [
  {
    id: 'ORD-7721',
    storeName: 'Print Master Pro',
    storeId: '1',
    serviceName: 'Color Print',
    quantity: 50,
    total: 500,
    status: 'out_for_delivery',
    placedAt: '2026-07-26T09:15:00+05:30',
    estimatedDelivery: '2026-07-27T18:30:00+05:30',
    timeline: buildTimeline('out_for_delivery', {
      placed: '2026-07-26T09:15:00+05:30',
      confirmed: '2026-07-26T09:32:00+05:30',
      processing: '2026-07-26T11:05:00+05:30',
      out_for_delivery: '2026-07-27T14:40:00+05:30',
    }),
    deliveryBoy: {
      name: 'Sujoy Mondal',
      phone: '+91 98301 44521',
      vehicle: 'Honda Activa · WB 02 AF 7734',
      rating: 4.8,
      lat: 22.5726,
      lng: 88.3639,
    },
  },
  {
    id: 'ORD-8812',
    storeName: 'Quick Copy Hub',
    storeId: '2',
    serviceName: 'B&W Xerox',
    quantity: 120,
    total: 120,
    status: 'processing',
    placedAt: '2026-07-27T08:05:00+05:30',
    estimatedDelivery: '2026-07-28T13:00:00+05:30',
    timeline: buildTimeline('processing', {
      placed: '2026-07-27T08:05:00+05:30',
      confirmed: '2026-07-27T08:19:00+05:30',
      processing: '2026-07-27T09:44:00+05:30',
    }),
  },
  {
    id: 'ORD-9901',
    storeName: 'Elite Press Studio',
    storeId: '3',
    serviceName: 'Premium Business Cards',
    quantity: 400,
    total: 1200,
    status: 'confirmed',
    placedAt: '2026-07-27T10:22:00+05:30',
    estimatedDelivery: '2026-07-29T17:00:00+05:30',
    timeline: buildTimeline('confirmed', {
      placed: '2026-07-27T10:22:00+05:30',
      confirmed: '2026-07-27T10:51:00+05:30',
    }),
  },
  {
    id: 'ORD-1122',
    storeName: 'Print Master Pro',
    storeId: '1',
    serviceName: 'Vinyl Banners',
    quantity: 2,
    total: 300,
    status: 'delivered',
    placedAt: '2026-07-18T12:40:00+05:30',
    estimatedDelivery: '2026-07-20T16:00:00+05:30',
    timeline: buildTimeline('delivered', {
      placed: '2026-07-18T12:40:00+05:30',
      confirmed: '2026-07-18T12:58:00+05:30',
      processing: '2026-07-18T15:20:00+05:30',
      out_for_delivery: '2026-07-20T10:10:00+05:30',
      delivered: '2026-07-20T14:32:00+05:30',
    }),
  },
  {
    id: 'ORD-3344',
    storeName: 'Quick Copy Hub',
    storeId: '2',
    serviceName: 'Custom Stickers',
    quantity: 200,
    total: 800,
    status: 'delivered',
    placedAt: '2026-07-10T17:05:00+05:30',
    estimatedDelivery: '2026-07-12T12:00:00+05:30',
    timeline: buildTimeline('delivered', {
      placed: '2026-07-10T17:05:00+05:30',
      confirmed: '2026-07-10T17:26:00+05:30',
      processing: '2026-07-11T09:15:00+05:30',
      out_for_delivery: '2026-07-12T09:40:00+05:30',
      delivered: '2026-07-12T11:22:00+05:30',
    }),
  },
  {
    id: 'ORD-5566',
    storeName: 'Elite Press Studio',
    storeId: '3',
    serviceName: 'Fine Art Prints',
    quantity: 4,
    total: 1000,
    status: 'delivered',
    placedAt: '2026-06-28T11:00:00+05:30',
    estimatedDelivery: '2026-07-01T15:00:00+05:30',
    timeline: buildTimeline('delivered', {
      placed: '2026-06-28T11:00:00+05:30',
      confirmed: '2026-06-28T11:34:00+05:30',
      processing: '2026-06-29T10:00:00+05:30',
      out_for_delivery: '2026-07-01T09:30:00+05:30',
      delivered: '2026-07-01T13:47:00+05:30',
    }),
  },
  {
    id: 'ORD-0011',
    storeName: 'Quick Copy Hub',
    storeId: '2',
    serviceName: 'B&W Print',
    quantity: 20,
    total: 20,
    status: 'cancelled',
    placedAt: '2026-06-22T19:12:00+05:30',
    estimatedDelivery: '2026-06-24T12:00:00+05:30',
    timeline: [
      {
        status: 'placed',
        label: ORDER_STATUS_LABELS.placed,
        timestamp: '2026-06-22T19:12:00+05:30',
      },
      {
        status: 'cancelled',
        label: 'Cancelled by customer',
        timestamp: '2026-06-22T19:48:00+05:30',
      },
    ],
  },
];
