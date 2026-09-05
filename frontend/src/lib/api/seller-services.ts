import { get, post, patch, del } from './client';

export interface SellerService {
  id: string;
  sellerId: string;
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  basePrice: number;
  unit: string;
  isActive: boolean;
}

/** Get all services for the authenticated seller. */
export const fetchSellerServices = async (): Promise<any[]> => {
  const res = await get('/seller/store/services');
  // Backend returns { categories: [ { services: [...] }, ... ] }
  const categories = res.categories || [];
  return categories.flatMap((cat: any) => cat.services);
};

/** Add a new service to the store. */
export const addSellerService = async (data: {
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  basePrice: number;
  unit: string;
}): Promise<SellerService> => post<SellerService>('/seller/store/services', data);

/** Update an existing service. */
export const updateSellerService = async (
  serviceId: string,
  data: { basePrice?: number; unit?: string; isActive?: boolean }
): Promise<SellerService> => patch<SellerService>(`/seller/store/services/${serviceId}`, data);

/** Remove a service from the store. */
export const deleteSellerService = async (serviceId: string): Promise<any> => {
  return del(`/seller/store/services/${serviceId}`);
};
