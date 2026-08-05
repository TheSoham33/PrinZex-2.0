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
