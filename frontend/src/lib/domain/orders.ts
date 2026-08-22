/** Dashboard order domain types, status labels and helpers. */

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
