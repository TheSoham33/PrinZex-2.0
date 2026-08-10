import { apiRequest } from './client';

/** Get all orders for the authenticated seller. */
export const fetchSellerOrders = async (params: {
  status?: string;
  isRush?: boolean;
  page?: number;
  limit?: number;
}): Promise<any> => {
  return apiRequest<any>('/seller/orders', { params });
};

/** Get a single order detail for the seller. */
export const fetchSellerOrderById = async (orderId: string): Promise<any> => {
  return apiRequest<any>(`/seller/orders/${orderId}`);
};

/** Update order status. */
export const updateOrderStatus = async (orderId: string, status: string): Promise<any> => {
  return apiRequest<any>(`/seller/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

/** Reject an order. */
export const rejectOrder = async (orderId: string, reason: string): Promise<any> => {
  return apiRequest<any>(`/seller/orders/${orderId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};
