import { api } from '@/lib/api-client';
import type { SellerAnalytics } from '@/lib/types/seller-analytics';

/** The full 60-day analytics payload from the backend. */
export const fetchSellerAnalytics = async (): Promise<SellerAnalytics> => {
  return api.get<SellerAnalytics>('/api/seller/analytics');
};
