import { apiRequest } from './client';

export const fetchStoreInfo = async (): Promise<any> => {
  return apiRequest<any>('/seller/store');
};

export const updateStoreInfo = async (data: any): Promise<any> => {
  return apiRequest<any>('/seller/store', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updateDeliverySettings = async (data: { deliveryRadius?: number; pincodes?: { pincode: string; isExcluded: boolean }[] }): Promise<any> => {
  return apiRequest<any>('/seller/settings/delivery', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updateStoreHours = async (hours: any[]): Promise<any> => {
  return apiRequest<any>('/seller/settings/hours', {
    method: 'PATCH',
    body: JSON.stringify({ hours }),
  });
};

export const updateNotificationSettings = async (preferences: Record<string, boolean>): Promise<any> => {
  return apiRequest<any>('/seller/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ preferences }),
  });
};

// NOTE: pricing overrides have exactly one writer — updatePricingOverrides in
// ./seller-inventory (used by the seller Pricing page). A second copy here
// would silently diverge.
