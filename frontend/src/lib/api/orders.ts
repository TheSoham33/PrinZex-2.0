import { apiRequest } from './client';
import type { DashboardOrder, OrderStatus } from '@/lib/domain/orders';

/** Returns every order for the signed-in customer. */
export const fetchOrders = async (): Promise<DashboardOrder[]> => {
  const res = await apiRequest<any>('/orders');

  // The backend returns { data: [...], pagination: { ... } }
  // apiRequest already returns the 'data' field of the ApiResponse envelope.
  const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

  return items.map((order: any) => ({
    id: order.id,
    storeName: order.storeName,
    storeId: order.sellerId ?? '',
    serviceName: order.services?.[0]?.split(' ×')[0] ?? 'Printing Service',
    quantity: 1,
    total: order.total,
    status: order.status as OrderStatus,
    placedAt: order.createdAt,
    estimatedDelivery: order.estimatedDelivery,
    timeline: [],
  }));
};

/**
 * Normalize the backend order detail into the shape the customer order page
 * renders. The API returns `seller: { storeName }`, `items[]`, `createdAt`
 * and `sellerId` — different field names than the page consumes.
 */
function mapCustomerOrderDetail(raw: any) {
  const firstItem = raw?.items?.[0];
  return {
    ...raw,
    id: raw?.id,
    status: raw?.status,
    total: Number(raw?.total ?? 0),
    serviceName: firstItem?.serviceName ?? 'Printing Service',
    storeName: raw?.seller?.storeName ?? '',
    storeId: raw?.sellerId ?? raw?.seller?.id ?? '',
    quantity: firstItem?.quantity ?? 1,
    placedAt: raw?.placedAt ?? raw?.createdAt,
    estimatedDelivery: raw?.estimatedDelivery,
    timeline: raw?.timeline ?? [],
  };
}

/** Returns one order detail, normalized for the customer order page. */
export const fetchOrderById = async (orderId: string): Promise<any> => {
  const data = await apiRequest<any>(`/orders/${orderId}`);
  return mapCustomerOrderDetail(data);
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
