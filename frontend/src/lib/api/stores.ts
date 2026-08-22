import { apiRequest } from './client';

export interface StoreListQuery {
  city?: string;
  q?: string;
  services?: string;
  minRating?: number;
  sort?: 'relevance' | 'rating' | 'distance' | 'price_asc' | 'price_desc';
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}

export const fetchStores = async (params: StoreListQuery = {}): Promise<any> => {
  return apiRequest<any>('/stores', { params: params as any });
};

export const fetchStoreById = async (sellerId: string): Promise<any> => {
  return apiRequest<any>(`/stores/${sellerId}`);
};

export const fetchStoreServices = async (sellerId: string): Promise<any> => {
  return apiRequest<any>(`/stores/${sellerId}/services`);
};

export const fetchStoreReviews = async (sellerId: string, params: any = {}): Promise<any> => {
  return apiRequest<any>(`/stores/${sellerId}/reviews`, { params });
};

export const fetchSearchSuggestions = async (q: string, city?: string): Promise<any> => {
  return apiRequest<any>('/stores/search/suggestions', { params: { q, city } });
};
