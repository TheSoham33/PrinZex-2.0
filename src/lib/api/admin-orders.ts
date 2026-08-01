import { fakeDelay } from '@/lib/utils';
import {
  MOCK_ADMIN_ORDERS,
  MOCK_TICKETS,
  type AdminOrder,
  type SupportTicket,
} from '@/lib/mock-data/admin-orders';

export const fetchAdminOrders = async (): Promise<AdminOrder[]> => {
  await fakeDelay();
  return MOCK_ADMIN_ORDERS;
};

export const fetchAdminOrderById = async (id: string): Promise<AdminOrder | null> => {
  await fakeDelay();
  return MOCK_ADMIN_ORDERS.find((o) => o.id === id) ?? null;
};

export const fetchSupportTickets = async (): Promise<SupportTicket[]> => {
  await fakeDelay();
  return MOCK_TICKETS;
};
