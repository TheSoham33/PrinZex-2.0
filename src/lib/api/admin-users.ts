import { api } from '@/lib/api-client';
import type { PlatformUser } from '@/lib/types/admin-users';

export const fetchPlatformUsers = async (): Promise<PlatformUser[]> =>
  api.get<PlatformUser[]>('/api/admin/users');

export const fetchPlatformUserById = async (id: string): Promise<PlatformUser | null> => {
  try {
    return await api.get<PlatformUser>(`/api/admin/users/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
};
