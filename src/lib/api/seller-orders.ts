import { fakeDelay } from '@/lib/utils';
import { MOCK_SELLER_ORDERS, type SellerOrder } from '@/lib/mock-data/seller-orders';

/** Mock API — the seller's full order queue. */
export const fetchSellerOrders = async (): Promise<SellerOrder[]> => {
  await fakeDelay();
  return MOCK_SELLER_ORDERS;
};

/** Mock API — a single order, or null when the id is unknown. */
export const fetchSellerOrderById = async (orderId: string): Promise<SellerOrder | null> => {
  await fakeDelay();
  return MOCK_SELLER_ORDERS.find((order) => order.id === orderId) ?? null;
};
