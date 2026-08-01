import { api } from '@/lib/api-client';
import type { SellerOrder } from '@/lib/types/seller-orders';

/** The seller's full order queue. */
export const fetchSellerOrders = async (): Promise<SellerOrder[]> => {
  return api.get<SellerOrder[]>('/api/seller/orders');
};

/** A single order, or null when the id is unknown. */
export const fetchSellerOrderById = async (orderId: string): Promise<SellerOrder | null> => {
  try {
    return await api.get<SellerOrder>(`/api/seller/orders/${encodeURIComponent(orderId)}`);
  } catch {
    return null;
  }
};
