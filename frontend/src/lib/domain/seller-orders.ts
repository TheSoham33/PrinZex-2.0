/** Seller-side order domain types, status config and helpers. */

export type SellerOrderStatus =
  | 'new'
  | 'placed'
  | 'accepted'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface SellerOrder {
  id: string;
  status: SellerOrderStatus;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  specifications: string;
  fileUrl?: string | null;
  fileName?: string;
  quantity: number;
  total: number;
  deadline: string;
  placedAt: string;
  isRush: boolean;
  specialInstructions: string | null;
}

export const SELLER_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  placed: 'New',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Dispatched',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const SELLER_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  placed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  accepted: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  processing: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ready_for_pickup: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  dispatched: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  out_for_delivery: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  delivered: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  returned: 'bg-slate-100 text-slate-700 ring-slate-600/20',
};

export const SELLER_STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500',
  placed: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  confirmed: 'bg-indigo-500',
  processing: 'bg-amber-500',
  ready_for_pickup: 'bg-purple-500',
  dispatched: 'bg-orange-500',
  out_for_delivery: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-slate-500',
};

/**
 * The forward-only progression a seller drives an order through. Matches the
 * backend state machine: placed → confirmed → processing → ready_for_pickup
 * (delivery takes over from there).
 */
export const SELLER_STATUS_FLOW: SellerOrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
];

export const ACTIVE_STATUSES: SellerOrderStatus[] = [
  'confirmed',
  'processing',
  'ready_for_pickup',
];

export const HISTORY_STATUSES: SellerOrderStatus[] = ['delivered', 'cancelled', 'returned'];

/** Preset rejection reasons shown in the inline reject flow. */
export const REJECTION_REASONS = [
  'Out of stock / material unavailable',
  'Cannot meet the requested deadline',
  'File is unusable or corrupted',
  'Outside our service capability',
];
