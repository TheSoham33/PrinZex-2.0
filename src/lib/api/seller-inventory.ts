import { api } from '@/lib/api-client';
import type {
  InventoryItem,
  Payout,
  SellerPricingEntry,
  SellerReview,
  TeamMember,
} from '@/lib/types/seller-inventory';

export const fetchInventory = async (): Promise<InventoryItem[]> =>
  api.get<InventoryItem[]>('/api/seller/inventory');

export const fetchPayouts = async (): Promise<Payout[]> =>
  api.get<Payout[]>('/api/seller/payouts');

export const fetchSellerPricing = async (): Promise<SellerPricingEntry[]> =>
  api.get<SellerPricingEntry[]>('/api/seller/pricing');

export const fetchSellerReviews = async (): Promise<SellerReview[]> =>
  api.get<SellerReview[]>('/api/seller/reviews');

export const fetchTeam = async (): Promise<TeamMember[]> =>
  api.get<TeamMember[]>('/api/seller/team');
