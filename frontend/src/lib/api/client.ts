import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { Store } from '@reduxjs/toolkit';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

let store: Store;

export const setStore = (s: Store) => {
  store = s;
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/** Resolve the auth token for an endpoint using the same priority rules the
 *  request layer applies (customer → seller → admin, with lane overrides). */
function resolveToken(endpoint: string): string | null {
  if (!store) return null;
  const state = store.getState() as RootState;
  let token: string | null = state.auth.accessToken;

  // Prioritize tokens based on the endpoint
  if (endpoint.startsWith('/admin')) {
    token = state.adminAuth.accessToken || state.auth.accessToken;
  } else if (endpoint.startsWith('/seller')) {
    // Onboarding routes use the customer token. The shared document lane
    // (/seller/register/documents + /status) is ALSO the seller-settings KYC
    // self-service, where only a SELLER token exists — the backend accepts
    // both, so fall back to the seller token.
    if (endpoint.startsWith('/seller/register')) {
      token = state.auth.accessToken || state.sellerAuth.accessToken;
    } else {
      token = state.sellerAuth.accessToken || state.auth.accessToken;
    }
  } else if (endpoint.startsWith('/delivery')) {
    // Rider self-service carries the delivery JWT (OTP login);
    // /delivery/register + /delivery/auth stay public.
    token = endpoint.startsWith('/delivery/register') || endpoint.startsWith('/delivery/auth')
      ? ''
      : state.deliveryAuth.accessToken || '';
  } else {
    token = state.auth.accessToken || state.sellerAuth.accessToken || state.adminAuth.accessToken;
  }

  return token || null;
}

/** Download a binary (e.g. PDF) through the authenticated client. The
 *  response is streamed to a Blob and saved with the server's suggested
 *  filename — used by the order GST invoice download. */
export async function downloadFile(endpoint: string, filenameFallback = 'download'): Promise<void> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers();
  const token = resolveToken(endpoint);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { headers });
  if (response.status === 401) {
    store?.dispatch(logout());
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Download failed — please try again.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const match = disposition && /filename="?([^";]+)"?/i.exec(disposition);
  const filename = (match?.[1] || filenameFallback).replace(/[\\/:*?"<>|]/g, '_');

  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    let hasParams = false;
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
        hasParams = true;
      }
    });
    if (hasParams) {
      url += `?${searchParams.toString()}`;
    }
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add auth token if available
  const token = resolveToken(endpoint);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
  });

  if (response.status === 401) {
    // Handle unauthorized - clear relevant tokens
    if (store) {
      if (endpoint.startsWith('/admin')) {
        const { adminLogout } = await import('@/store/slices/adminAuthSlice');
        store.dispatch(adminLogout());
      } else if (endpoint.startsWith('/seller')) {
        // Onboarding (/seller/register with a customer token) clears the
        // customer session; everything else — including the KYC self-service
        // carrying a seller token — clears the seller session.
        const state = store.getState() as RootState;
        if (endpoint.startsWith('/seller/register') && !state.sellerAuth.accessToken) {
          store.dispatch(logout());
        } else {
          const { sellerLogout } = await import('@/store/slices/sellerAuthSlice');
          store.dispatch(sellerLogout());
        }
      } else if (endpoint.startsWith('/delivery')) {
        const { deliveryLogout } = await import('@/store/slices/deliveryAuthSlice');
        store.dispatch(deliveryLogout());
      } else {
        store.dispatch(logout());
      }
    }
    throw new Error('Unauthorized');
  }

  // Handle non-JSON or empty responses safely
  const contentType = response.headers.get('content-type');
  let data: any;

  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { message: 'Invalid JSON response from server' };
    }
  } else {
    const text = await response.text();
    data = { message: text || `Error ${response.status}: ${response.statusText}` };
  }

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Something went wrong') as any;
    error.errors = data.errors;
    error.statusCode = response.status;
    throw error;
  }

  return data.data !== undefined ? data.data : data;
}

/* ------------------------------------------------------------------ */
/* Verb helpers — the api helper layer. Every endpoint wrapper below   */
/* is a one-liner on these; nobody stringifies bodies by hand.         */
/* ------------------------------------------------------------------ */

type QueryParams = RequestOptions['params'];

/** GET endpoint, optional query params. */
export const get = <T = any>(endpoint: string, params?: QueryParams): Promise<T> =>
  apiRequest<T>(endpoint, { params });

/** GET list endpoint: every caller only wants the array (`res.data || res`). */
export const getList = async <T = any>(endpoint: string, params?: QueryParams): Promise<T[]> => {
  const res = await apiRequest<any>(endpoint, { params });
  return res.data || res;
};

const withBody = <T>(method: string, endpoint: string, body?: unknown): Promise<T> =>
  apiRequest<T>(endpoint, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

/** POST endpoint with an optional JSON body. */
export const post = <T = any>(endpoint: string, body?: unknown): Promise<T> =>
  withBody<T>('POST', endpoint, body);

/** PATCH endpoint with an optional JSON body. */
export const patch = <T = any>(endpoint: string, body?: unknown): Promise<T> =>
  withBody<T>('PATCH', endpoint, body);

/** PUT endpoint with a JSON body. */
export const put = <T = any>(endpoint: string, body: unknown): Promise<T> =>
  withBody<T>('PUT', endpoint, body);

/** DELETE endpoint. */
export const del = <T = any>(endpoint: string): Promise<T> =>
  apiRequest<T>(endpoint, { method: 'DELETE' });
