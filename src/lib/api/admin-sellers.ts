import { api } from '@/lib/api-client';
import type { AdminSeller } from '@/lib/types/admin-sellers';

export const fetchAdminSellers = async (): Promise<AdminSeller[]> =>
  api.get<AdminSeller[]>('/api/admin/sellers');

export const fetchAdminSellerById = async (id: string): Promise<AdminSeller | null> => {
  try {
    return await api.get<AdminSeller>(`/api/admin/sellers/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
};
