import { fakeDelay } from '@/lib/utils';
import { MOCK_ADMIN_SELLERS, type AdminSeller } from '@/lib/mock-data/admin-sellers';

export const fetchAdminSellers = async (): Promise<AdminSeller[]> => {
  await fakeDelay();
  return MOCK_ADMIN_SELLERS;
};

export const fetchAdminSellerById = async (id: string): Promise<AdminSeller | null> => {
  await fakeDelay();
  return MOCK_ADMIN_SELLERS.find((s) => s.id === id) ?? null;
};
