import { getList, post, patch } from './client';

export const fetchPlatformUsers = async (params: any = {}): Promise<any[]> => getList('/admin/users', params);

export const suspendUser = async (id: string, reason: string): Promise<any> => patch(`/admin/users/${id}/suspend`, { reason });

export const unsuspendUser = async (id: string): Promise<any> => patch(`/admin/users/${id}/unsuspend`);

export const creditUserWallet = async (id: string, data: { amount: number; reason: string }): Promise<any> => post(`/admin/users/${id}/wallet-credit`, data);

/** Credit many wallets at once — explicit user ids, or every customer. */
export const bulkCreditWallets = async (data: { userIds?: string[]; allCustomers?: boolean; amount: number; reason: string }): Promise<{ credited: number; amount: number; totalCredited: number }> => post('/admin/users/wallet-credit-bulk', data);
