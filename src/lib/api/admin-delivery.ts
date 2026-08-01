import { fakeDelay } from '@/lib/utils';
import { MOCK_DELIVERY_BOYS, type DeliveryBoy } from '@/lib/mock-data/admin-delivery';

export const fetchDeliveryBoys = async (): Promise<DeliveryBoy[]> => {
  await fakeDelay();
  return MOCK_DELIVERY_BOYS;
};

export const fetchDeliveryBoyById = async (id: string): Promise<DeliveryBoy | null> => {
  await fakeDelay();
  return MOCK_DELIVERY_BOYS.find((d) => d.id === id) ?? null;
};
