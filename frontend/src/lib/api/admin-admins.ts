import { apiRequest } from './client';

export const fetchAdminAccounts = async (): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/admins');
  return res.data || res;
};

export const inviteAdmin = async (data: any): Promise<any> => {
  return apiRequest<any>('/admin/admins/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAdminRole = async (id: string, role: string): Promise<any> => {
  return apiRequest<any>(`/admin/admins/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

export const deactivateAdmin = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/admins/${id}/deactivate`, {
    method: 'POST',
  });
};
