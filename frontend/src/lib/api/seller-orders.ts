import { apiRequest } from './client';
import type { SellerOrder } from '@/lib/domain/seller-orders';

/** Get all orders for the authenticated seller. */
export const fetchSellerOrders = async (params: {
  status?: string;
  isRush?: boolean;
  page?: number;
  limit?: number;
}): Promise<any> => {
  return apiRequest<any>('/seller/orders', { params });
};

/** Flatten a specs JSON blob into a short human-readable summary. */
function summarizeSpecs(specs: unknown): string {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return '';
  return Object.entries(specs as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== '' && !Array.isArray(value))
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(', ');
}

/**
 * Normalize the backend order-detail payload into the SellerOrder shape the
 * detail page renders. The API returns `customer: { name, maskedPhone }`,
 * `createdAt`, `estimatedDelivery` and `items[]` — all different field names
 * than the page consumes.
 */
export function mapSellerOrderDetail(raw: any): SellerOrder {
  const firstItem = raw?.items?.[0];
  return {
    id: raw?.id ?? '',
    status: raw?.status ?? 'placed',
    isRush: raw?.isRush ?? false,
    customerName: raw?.customer?.name ?? '',
    customerPhone: raw?.customer?.maskedPhone ?? null,
    serviceName: firstItem?.serviceName ?? 'Document Printing',
    specifications: summarizeSpecs(firstItem?.specifications),
    quantity: (raw?.items ?? []).reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0) || 1,
    total: Number(raw?.total ?? 0),
    deadline: raw?.deadline ?? raw?.estimatedDelivery,
    placedAt: raw?.placedAt ?? raw?.createdAt,
    fileName: firstItem?.fileUrl?.split('/').pop() ?? '',
    specialInstructions: raw?.specialInstructions ?? null,
  };
}

/** Get a single order detail for the seller, normalized for the detail page. */
export const fetchSellerOrderById = async (orderId: string): Promise<SellerOrder> => {
  const data = await apiRequest<any>(`/seller/orders/${orderId}`);
  return mapSellerOrderDetail(data);
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
