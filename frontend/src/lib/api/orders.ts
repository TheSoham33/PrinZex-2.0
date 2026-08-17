import { apiRequest } from './client';

export interface DashboardOrder {
  id: string;
  storeName: string;
  serviceName: string;
  quantity: number;
  total: number;
  status: any;
  placedAt: string;
  estimatedDelivery: string;
}

/** Returns every order for the signed-in customer. */
export const fetchOrders = async (): Promise<DashboardOrder[]> => {
  const res = await apiRequest<any>('/orders');
  
  // The backend returns { data: [...], pagination: { ... } }
  // apiRequest already returns the 'data' field of the ApiResponse envelope.
  // So 'res' is { data: [...], pagination: { ... } }
  const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

  return items.map((order: any) => ({
    id: order.id,
    storeName: order.storeName,
    serviceName: order.services?.[0] || 'Printing Service',
    quantity: 1, 
    total: order.total,
    status: order.status,
    placedAt: order.createdAt,
    estimatedDelivery: order.estimatedDelivery,
  }));
};

/** Returns one order detail. */
export const fetchOrderById = async (orderId: string): Promise<any> => {
  return apiRequest<any>(`/orders/${orderId}`);
};

/** Place a new order. */
export const placeOrder = async (orderData: any): Promise<any> => {
  return apiRequest<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

/** Get a quote for potential order. */
export const getOrderQuote = async (quoteData: any): Promise<any> => {
  return apiRequest<any>('/orders/quote', {
    method: 'POST',
    body: JSON.stringify(quoteData),
  });
};

/** Cancel an order. */
export const cancelOrder = async (orderId: string, reason?: string): Promise<any> => {
  return apiRequest<any>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

/** Submit a review for an order. */
export const submitOrderReview = async (orderId: string, reviewData: any): Promise<any> => {
  return apiRequest<any>(`/orders/${orderId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
};
