import { getList } from './client';

export const fetchActivityLogs = async (params: any = {}): Promise<any[]> => getList('/admin/activity-log', params);
