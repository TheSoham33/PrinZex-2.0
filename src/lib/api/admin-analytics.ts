import { api } from '@/lib/api-client';
import type { PlatformAnalytics } from '@/lib/types/admin-analytics';

export const fetchPlatformAnalytics = async (): Promise<PlatformAnalytics> => {
  return api.get<PlatformAnalytics>('/api/admin/analytics');
};
