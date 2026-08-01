import { api } from '@/lib/api-client';
import type { Store, StoreDetail } from '@/lib/types/stores';

/** All approved print shops. */
export const fetchStores = async (): Promise<Store[]> => {
  return api.get<Store[]>('/api/stores');
};

/** A single store's full detail, or null when unknown. */
export const fetchStoreById = async (id: string): Promise<StoreDetail | null> => {
  try {
    return await api.get<StoreDetail>(`/api/stores/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
};
