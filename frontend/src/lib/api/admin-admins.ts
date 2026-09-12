import { getList, post, patch } from './client';

export const fetchAdminAccounts = async (): Promise<any[]> => {
  return getList('/admin/admins');
};

export const inviteAdmin = async (data: any): Promise<any> => post('/admin/admins/invite', data);

export const updateAdminRole = async (id: string, role: string): Promise<any> => patch(`/admin/admins/${id}/role`, { role });

export const deactivateAdmin = async (id: string): Promise<any> => post(`/admin/admins/${id}/deactivate`);
