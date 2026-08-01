import { fakeDelay } from '@/lib/utils';
import {
  MOCK_INVENTORY,
  MOCK_PAYOUTS,
  MOCK_SELLER_PRICING,
  MOCK_SELLER_REVIEWS,
  MOCK_TEAM,
  type InventoryItem,
  type Payout,
  type SellerPricingEntry,
  type SellerReview,
  type TeamMember,
} from '@/lib/mock-data/seller-inventory';

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  await fakeDelay();
  return MOCK_INVENTORY;
};

export const fetchPayouts = async (): Promise<Payout[]> => {
  await fakeDelay();
  return MOCK_PAYOUTS;
};

export const fetchSellerPricing = async (): Promise<SellerPricingEntry[]> => {
  await fakeDelay();
  return MOCK_SELLER_PRICING;
};

export const fetchSellerReviews = async (): Promise<SellerReview[]> => {
  await fakeDelay();
  return MOCK_SELLER_REVIEWS;
};

export const fetchTeam = async (): Promise<TeamMember[]> => {
  await fakeDelay();
  return MOCK_TEAM;
};
