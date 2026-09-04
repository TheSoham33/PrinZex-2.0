import { apiRequest } from './client';

export const fetchPlatformUsers = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/users', { params });
  return res.data || res;
};

export const suspendUser = async (id: string, reason: string): Promise<any> => {
  return apiRequest<any>(`/admin/users/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const unsuspendUser = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/users/${id}/unsuspend`, {
    method: 'PATCH',
  });
};

export const creditUserWallet = async (id: string, data: { amount: number; reason: string }): Promise<any> => {
  return apiRequest<any>(`/admin/users/${id}/wallet-credit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
