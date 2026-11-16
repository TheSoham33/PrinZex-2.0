import { get, post, patch, del } from './client';

export const updateProfile = async (data: { 
  name?: string; 
  email?: string; 
  phone?: string;
  avatarUrl?: string;
}): Promise<any> => patch('/customer/profile', data);

export const fetchAddresses = async (): Promise<any[]> => {
  return get<any[]>('/customer/addresses');
};

export const createAddress = async (data: any): Promise<any> => post('/customer/addresses', data);

export const deleteAddress = async (id: string): Promise<any> => {
  return del(`/customer/addresses/${id}`);
};

export const setDefaultAddress = async (id: string): Promise<any> => patch(`/customer/addresses/${id}/set-default`);

// ── Notifications (Mongo-backed, real-time via socket invalidation) ────────

export interface ApiNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  channel?: string[];
  createdAt: string;
}

export const fetchNotifications = async (
  params: { page?: number; limit?: number; isRead?: 'true' | 'false' | 'all' } = {},
): Promise<{ notifications: any; unreadCount: number }> =>
  get('/customer/notifications', params as any);

export const markNotificationRead = (id: string): Promise<ApiNotification> =>
  post(`/customer/notifications/${id}/read`);

export const markAllNotificationsRead = (): Promise<{ modified: number }> =>
  post('/customer/notifications/read-all');
