import { api } from '@/lib/api-client';
import type { DashboardOrder } from '@/lib/types/orders';

/** The signed-in customer's orders. */
export const fetchOrders = async (): Promise<DashboardOrder[]> => {
  const data = await api.get<DashboardOrder[]>('/api/orders');
  return data;
};

/** A single order for the signed-in customer, or null when unknown. */
export const fetchOrderById = async (orderId: string): Promise<DashboardOrder | null> => {
  try {
    return await api.get<DashboardOrder>(`/api/orders/${encodeURIComponent(orderId)}`);
  } catch {
    return null;
  }
};

export const placeOrder = async (payload: {
  storeId: string;
  serviceName?: string;
  quantity?: number;
  total?: number;
  addressId?: string;
  deliverySpeed?: string;
  notes?: string;
  items?: { name: string; quantity: number; unitPrice: number }[];
}) => {
  return api.post<{ id: string; orderId: string }>('/api/orders', payload);
};
