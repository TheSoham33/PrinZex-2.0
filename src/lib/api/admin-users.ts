import { fakeDelay } from '@/lib/utils';
import { MOCK_PLATFORM_USERS, type PlatformUser } from '@/lib/mock-data/admin-users';

export const fetchPlatformUsers = async (): Promise<PlatformUser[]> => {
  await fakeDelay();
  return MOCK_PLATFORM_USERS;
};

export const fetchPlatformUserById = async (id: string): Promise<PlatformUser | null> => {
  await fakeDelay();
  return MOCK_PLATFORM_USERS.find((u) => u.id === id) ?? null;
};
