import { apiRequest } from './client';

export const fetchAdminSellers = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/sellers', { params });
  return res.data || res;
};

export const fetchAdminSellerById = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${id}`);
};

export const approveSeller = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${id}/approve`, {
    method: 'POST',
  });
};

export const rejectSeller = async (id: string, reason: string): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const suspendSeller = async (id: string, reason: string): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const updateSellerCommission = async (id: string, commissionRate: number): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${id}/commission`, {
    method: 'PATCH',
    body: JSON.stringify({ commissionRate }),
  });
};

export const verifySellerDocument = async (sellerId: string, documentType: string): Promise<any> => {
  return apiRequest<any>(`/admin/sellers/${sellerId}/verify-document`, {
    method: 'POST',
    body: JSON.stringify({ documentType }),
  });
};
