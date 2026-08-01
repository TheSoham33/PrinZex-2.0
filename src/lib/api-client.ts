/**
 * Minimal fetch wrapper for the PrinZex API routes. Reads the auth token from
 * localStorage, attaches it as a Bearer header, and unwraps the `{ data }`
 * envelope returned by every route handler.
 */

const TOKEN_KEY = 'prinzex_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  let json: { data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error(`Request to ${path} failed (${res.status})`);
  }

  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Request to ${path} failed (${res.status})`);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET', cache: 'no-store' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
