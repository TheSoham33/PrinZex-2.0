import { apiRequest } from './client';

export const fetchDeliveryBoys = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/delivery/boys', { params });
  return res.data || res;
};

export const fetchDeliveryBoyById = async (id: string): Promise<any> => {
  return apiRequest<any>(`/admin/delivery/boys/${id}`);
};

export const updateDeliveryBoyStatus = async (id: string, status: string, reason?: string): Promise<any> => {
  return apiRequest<any>(`/admin/delivery/boys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
};

export const verifyDeliveryBoyDocument = async (id: string, documentType: string, isVerified: boolean): Promise<any> => {
  return apiRequest<any>(`/admin/delivery/boys/${id}/verify-document`, {
    method: 'POST',
    body: JSON.stringify({ documentType, isVerified }),
  });
};
