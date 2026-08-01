import { api } from '@/lib/api-client';
import type { AdminOrder, SupportTicket } from '@/lib/types/admin-orders';

export const fetchAdminOrders = async (): Promise<AdminOrder[]> =>
  api.get<AdminOrder[]>('/api/admin/orders');

export const fetchAdminOrderById = async (id: string): Promise<AdminOrder | null> => {
  try {
    return await api.get<AdminOrder>(`/api/admin/orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
};

export const fetchSupportTickets = async (): Promise<SupportTicket[]> =>
  api.get<SupportTicket[]>('/api/admin/support/tickets');
