import { getList, post, patch } from './client';

export const fetchPlatformUsers = async (params: any = {}): Promise<any[]> => getList('/admin/users', params);

export const suspendUser = async (id: string, reason: string): Promise<any> => patch(`/admin/users/${id}/suspend`, { reason });

export const unsuspendUser = async (id: string): Promise<any> => patch(`/admin/users/${id}/unsuspend`);

export const creditUserWallet = async (id: string, data: { amount: number; reason: string }): Promise<any> => post(`/admin/users/${id}/wallet-credit`, data);
