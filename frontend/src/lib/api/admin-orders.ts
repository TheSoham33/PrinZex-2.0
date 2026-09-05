import { get, getList, post } from './client';

export const fetchAdminOrders = async (params: any = {}): Promise<any[]> => getList('/admin/orders', params);

export const fetchAdminOrderById = async (id: string): Promise<any> => get(`/admin/orders/${id}`);

export const assignDeliveryBoy = async (orderId: string, deliveryBoyId: string): Promise<any> => post(`/admin/orders/${orderId}/assign-delivery`, { deliveryBoyId });

export const fetchSupportTickets = async (params: any = {}): Promise<any[]> => {
  // If params is passed by React Query (it's an object with queryKey, signal etc), 
  // we want to ignore it and use our default empty object.
  const queryParams = (params && params.queryKey) ? {} : params;
  return getList('/admin/support/tickets', queryParams);
};

export const fetchSupportTicketById = async (id: string): Promise<any> => {
  const res = await get(`/admin/support/tickets/${id}`);
  const data = res.data || res;
  // Map 'messages' to 'thread' for frontend compatibility
  return {
    ...data,
    thread: (data.messages || []).map((m: any) => ({
      id: m.id,
      from: m.senderType === 'customer' ? 'customer' : 'agent',
      author: m.senderType === 'customer' ? (data.customer?.name || 'Customer') : 'Support Agent',
      body: m.content,
      at: m.createdAt
    }))
  };
};

export const replyToSupportTicket = async (id: string, content: string): Promise<any> => post(`/admin/support/tickets/${id}/reply`, { content });
