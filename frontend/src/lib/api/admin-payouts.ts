import { apiRequest } from './client';

export const fetchPayouts = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/payouts', { params });
  return res.data || res;
};

// Aliases for frontend compatibility in Payouts page
export const fetchSellerPayouts = async () => fetchPayouts({ recipientType: 'seller' });
export const fetchDeliveryPayouts = async () => fetchPayouts({ recipientType: 'delivery_boy' });

export const approvePayout = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/payouts/${id}/approve`, {
    method: 'POST',
  });
};

export const markPayoutPaid = async (id: string, transactionRef: string): Promise<any> => {
  return apiRequest<any>(`/admin/payouts/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({ transactionRef }),
  });
};

export const failPayout = async (id: string, reason: string): Promise<any> => {
  return apiRequest<any>(`/admin/payouts/${id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const fetchAdminAnalyticsKPI = async (params: any = {}): Promise<any> => {
  return apiRequest<any>('/admin/analytics/kpi', { params });
};

export const fetchCommissions = async (): Promise<any[]> => {
  // Mocking global commissions for now
  return [
    { categoryId: 'cat_documents', category: 'Document Printing', rate: 12 },
    { categoryId: 'cat_photos', category: 'Photo Printing', rate: 15 },
    { categoryId: 'cat_business', category: 'Business Stationery', rate: 10 },
  ];
};
