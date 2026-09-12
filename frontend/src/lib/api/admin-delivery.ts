import { get, getList, post, patch } from './client';

export const fetchDeliveryBoys = async (params: any = {}): Promise<any[]> => getList('/admin/delivery/boys', params);

export const fetchDeliveryBoyById = async (id: string): Promise<any> => get(`/admin/delivery/boys/${id}`);

export const updateDeliveryBoyStatus = async (id: string, status: string, reason?: string): Promise<any> => patch(`/admin/delivery/boys/${id}/status`, { status, reason });

export const verifyDeliveryBoyDocument = async (id: string, documentType: string, isVerified: boolean): Promise<any> => post(`/admin/delivery/boys/${id}/verify-document`, { documentType, isVerified });
