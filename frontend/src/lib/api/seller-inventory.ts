import { apiRequest } from './client';

export const fetchInventory = async (params: any = {}): Promise<any[]> => {
  return apiRequest<any>('/seller/inventory', { params });
};

export const fetchPayouts = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/seller/payouts', { params });
  return res.data || res;
};

export interface PricingInfo {
  services: any[];
  bulkDiscountTiers: any[];
}

export const fetchSellerPricing = async (): Promise<PricingInfo> => {
  return apiRequest<PricingInfo>('/seller/pricing');
};

export const updateBulkPrices = async (prices: Array<{ serviceId: string; basePrice: number; unit: string }>): Promise<any> => {
  return apiRequest<any>('/seller/pricing/bulk', {
    method: 'PATCH',
    body: JSON.stringify(prices),
  });
};

export const updateBulkDiscounts = async (tiers: Array<{ minQty: number; discountPct: number }>): Promise<any> => {
  return apiRequest<any>('/seller/pricing/bulk-discounts', {
    method: 'PATCH',
    body: JSON.stringify({ tiers }),
  });
};

export const updatePricingOverrides = async (overrides: {
  pageRate?: { bw: number; color: number };
  coverType?: Record<string, number>;
  coilType?: Record<string, number>;
  coverColor?: Record<string, number>;
  hardCoverColors?: string[];
  hardFoilColors?: string[];
  servicePaperOptions?: Record<
    string,
    {
      paperTypes?: Record<string, number>;
      paperSizes?: Record<string, number>;
    }
  >;
}): Promise<any> => {
  return apiRequest<any>('/seller/settings/pricing-overrides', {
    method: 'PATCH',
    body: JSON.stringify({ overrides }),
  });
};

export const fetchSellerReviews = async (): Promise<any[]> => {
  // Reviews are currently under admin or public, but let's check if there's a seller specific one.
  // Actually, we don't have a seller-specific review list endpoint yet.
  return [];
};

export const fetchTeam = async (): Promise<any[]> => {
  return apiRequest<any[]>('/seller/team');
};
