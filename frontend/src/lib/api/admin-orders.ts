import { apiRequest } from './client';

export const fetchAdminOrders = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/orders', { params });
  return res.data || res;
};

export const fetchAdminOrderById = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/orders/${id}`);
};

export const assignDeliveryBoy = async (orderId: string, deliveryBoyId: string): Promise<any> => {
  return apiRequest<any>(`/admin/orders/${orderId}/assign-delivery`, {
    method: 'POST',
    body: JSON.stringify({ deliveryBoyId }),
  });
};

export const updateAdminOrderStatus = async (id: string, data: { status: string; note?: string }): Promise<any> => {
  return apiRequest<any>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const refundAdminOrder = async (id: string, data: { amount: number; reason: string }): Promise<any> => {
  return apiRequest<any>(`/admin/orders/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchSupportTickets = async (params: any = {}): Promise<any[]> => {
  // If params is passed by React Query (it's an object with queryKey, signal etc), 
  // we want to ignore it and use our default empty object.
  const queryParams = (params && params.queryKey) ? {} : params;
  const res = await apiRequest<any>('/admin/support/tickets', { params: queryParams });
  return res.data || res;
};

export const fetchSupportTicketById = async (id: string): Promise<any> => {
  const res = await apiRequest<any>(`/admin/support/tickets/${id}`);
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

export const replyToSupportTicket = async (id: string, content: string): Promise<any> => {
  return apiRequest<any>(`/admin/support/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
};
