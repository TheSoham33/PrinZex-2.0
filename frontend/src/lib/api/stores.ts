import { get } from './client';

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

export const fetchStores = async (params: StoreListQuery = {}): Promise<any> => get('/stores', params as any);

export interface StoreCategory {
  categoryId: string;
  categoryName: string;
}

/** Distinct service categories offered by approved sellers (for the filter UI). */
export const fetchStoreCategories = async (): Promise<StoreCategory[]> => {
  const res = await get('/stores/categories');
  return res.categories ?? res ?? [];
};
