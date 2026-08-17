import { fakeDelay } from '@/lib/utils';
import { MOCK_PLATFORM_ANALYTICS, type PlatformAnalytics } from '@/lib/mock-data/admin-analytics';

export const fetchPlatformAnalytics = async (): Promise<PlatformAnalytics> => {
  await fakeDelay(700);
  return MOCK_PLATFORM_ANALYTICS;
};
