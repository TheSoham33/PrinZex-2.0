import { apiRequest } from './client';

export const fetchActivityLogs = async (params: any = {}): Promise<any[]> => {
  const res = await apiRequest<any>('/admin/activity-log', { params });
  return res.data || res;
};
