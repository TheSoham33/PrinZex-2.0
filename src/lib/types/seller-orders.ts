/** Seller-side order domain types + mock queue data. */

export type SellerOrderStatus =
  | 'new'
  | 'accepted'
  | 'processing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface SellerOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  /** Human-readable spec summary, e.g. "A4 Colour, 50 pages, Lamination". */
  specifications: string;
  /** Mock file reference — never fetched. */
  fileUrl: string;
  fileName: string;
  quantity: number;
  total: number;
  status: SellerOrderStatus;
  placedAt: string;
  deadline: string;
  isRush: boolean;
  specialInstructions: string;
}

export const SELLER_STATUS_LABELS: Record<SellerOrderStatus, string> = {
  new: 'New',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const SELLER_STATUS_STYLES: Record<SellerOrderStatus, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  accepted: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  processing: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ready_for_pickup: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  dispatched: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  delivered: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  returned: 'bg-slate-100 text-slate-700 ring-slate-600/20',
};

export const SELLER_STATUS_DOT: Record<SellerOrderStatus, string> = {
  new: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  processing: 'bg-amber-500',
  ready_for_pickup: 'bg-purple-500',
  dispatched: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-slate-500',
};

/** The forward-only progression a seller drives an order through. */
export const SELLER_STATUS_FLOW: SellerOrderStatus[] = [
  'new',
  'accepted',
  'processing',
  'ready_for_pickup',
  'dispatched',
  'delivered',
];

export const ACTIVE_STATUSES: SellerOrderStatus[] = [
  'accepted',
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


