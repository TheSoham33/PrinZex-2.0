/** Seller (print shop) records for the admin Sellers pages. */

export type SellerAccountStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type DocumentStatus = 'verified' | 'needs_review' | 'rejected';

export interface SellerDocument {
  type: string;
  label: string;
  fileName: string;
  status: DocumentStatus;
}

export interface SellerOrderRow {
  id: string;
  customer: string;
  service: string;
  total: number;
  status: string;
  placedAt: string;
}

export interface SellerReviewRow {
  id: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SellerPayoutRow {
  id: string;
  amount: number;
  status: string;
  date: string;
}

export interface AdminSeller {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  servicesCount: number;
  services: string[];
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  status: SellerAccountStatus;
  joinedAt: string;
  commissionRate: number;
  completionRate: number;
  onTimeDeliveryPct: number;
  totalPaidOut: number;
  pendingBalance: number;
  documents: SellerDocument[];
  orders: SellerOrderRow[];
  reviews: SellerReviewRow[];
  payouts: SellerPayoutRow[];
}

export const REJECTION_REASONS = [
  'Documents unclear or illegible',
  'GST number could not be verified',
  'Business address does not match records',
  'Duplicate application already on file',
];

export const MOCK_ADMIN_SELLERS: AdminSeller[] = [];
