import { api, setToken, clearToken } from '@/lib/api-client';

export interface SellerAuth {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  status: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string; sellerId?: string };
  emailVerified?: boolean;
  seller?: SellerAuth;
}

export async function login(email: string, password: string, role?: 'admin' | 'seller') {
  const data = await api.post<AuthResponse>('/api/auth/login', { email, password, role });
  setToken(data.token);
  return data;
}

export async function register(name: string, email: string, password: string) {
  const data = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
  setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await api.post<{ ok: boolean }>('/api/auth/logout');
  } catch {
    /* ignore */
  }
  clearToken();
}
