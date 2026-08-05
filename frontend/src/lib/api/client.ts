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
  if (store) {
    const state = store.getState() as RootState;
    let token = state.auth.accessToken;
    
    // Prioritize tokens based on the endpoint
    if (endpoint.startsWith('/admin')) {
      token = state.adminAuth.accessToken || state.auth.accessToken;
    } else if (endpoint.startsWith('/seller')) {
      // Special case: Onboarding routes use the customer token
      if (endpoint.startsWith('/seller/register')) {
        token = state.auth.accessToken;
      } else {
        token = state.sellerAuth.accessToken || state.auth.accessToken;
      }
    } else {
      token = state.auth.accessToken || state.sellerAuth.accessToken || state.adminAuth.accessToken;
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
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
        // Special case: onboarding uses customer token
        if (endpoint.startsWith('/seller/register')) {
          store.dispatch(logout());
        } else {
          const { sellerLogout } = await import('@/store/slices/sellerAuthSlice');
          store.dispatch(sellerLogout());
        }
      } else {
        store.dispatch(logout());
      }
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong') as any;
    error.errors = data.errors;
    error.statusCode = response.status;
    throw error;
  }

  return data.data !== undefined ? data.data : data;
}
