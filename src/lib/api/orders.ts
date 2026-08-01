import { fakeDelay } from '@/lib/utils';
import { MOCK_ORDERS, type DashboardOrder } from '@/lib/mock-data/orders';

/** Mock API — returns every order for the signed-in customer. */
export const fetchOrders = async (): Promise<DashboardOrder[]> => {
  await fakeDelay();
  return MOCK_ORDERS;
};

/** Mock API — returns one order, or null when the id is unknown. */
export const fetchOrderById = async (orderId: string): Promise<DashboardOrder | null> => {
  await fakeDelay();
  return MOCK_ORDERS.find((order) => order.id === orderId) ?? null;
};
