import { api } from '@/lib/api-client';
import type { DeliveryBoy } from '@/lib/types/admin-delivery';

export const fetchDeliveryBoys = async (): Promise<DeliveryBoy[]> =>
  api.get<DeliveryBoy[]>('/api/admin/delivery');

export const fetchDeliveryBoyById = async (id: string): Promise<DeliveryBoy | null> => {
  try {
    const list = await api.get<DeliveryBoy[]>('/api/admin/delivery');
    return list.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
};
