import { get, patch } from './client';

export const fetchStoreInfo = async (): Promise<any> => get('/seller/store');

export const updateStoreInfo = async (data: any): Promise<any> => patch('/seller/store', data);

export const updateDeliverySettings = async (data: { deliveryRadius?: number; pincodes?: { pincode: string; isExcluded: boolean }[] }): Promise<any> => patch('/seller/settings/delivery', data);

export const updateStoreHours = async (hours: any[]): Promise<any> => patch('/seller/settings/hours', { hours });

export const updateNotificationSettings = async (preferences: Record<string, boolean>): Promise<any> => patch('/seller/settings/notifications', { preferences });

// NOTE: pricing overrides have exactly one writer — updatePricingOverrides in
// ./seller-inventory (used by the seller Pricing page). A second copy here
// would silently diverge.
