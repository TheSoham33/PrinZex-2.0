import { fakeDelay } from '@/lib/utils';
import { MOCK_SELLER_ANALYTICS, type SellerAnalytics } from '@/lib/mock-data/seller-analytics';

/**
 * Mock API — the full 60-day analytics payload. The date-range selector slices
 * this client-side, so changing the range never refetches.
 */
export const fetchSellerAnalytics = async (): Promise<SellerAnalytics> => {
  await fakeDelay(700);
  return MOCK_SELLER_ANALYTICS;
};
