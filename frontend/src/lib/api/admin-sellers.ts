import { get, getList, post, patch } from './client';

export const fetchAdminSellers = async (params: any = {}): Promise<any[]> => getList('/admin/sellers', params);

export const fetchAdminSellerById = async (id: string): Promise<any> => get(`/admin/sellers/${id}`);

export const approveSeller = async (id: string): Promise<any> => post(`/admin/sellers/${id}/approve`);

export const rejectSeller = async (id: string, reason: string): Promise<any> => post(`/admin/sellers/${id}/reject`, { reason });

export const suspendSeller = async (id: string, reason: string): Promise<any> => post(`/admin/sellers/${id}/suspend`, { reason });

export const updateSellerCommission = async (id: string, commissionRate: number): Promise<any> => patch(`/admin/sellers/${id}/commission`, { commissionRate });
