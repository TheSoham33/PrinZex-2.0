import { api } from '@/lib/api-client';
import type { DeliveryAddress } from '@/lib/types/stores';

/** The signed-in customer's saved addresses. */
export const fetchAddresses = async (): Promise<DeliveryAddress[]> => {
  return api.get<DeliveryAddress[]>('/api/addresses');
};

export const createAddress = async (input: {
  label?: string;
  fullAddress?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}): Promise<DeliveryAddress> => {
  return api.post<DeliveryAddress>('/api/addresses', input);
};
