'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { restoreSession, type AuthUser } from '@/store/slices/authSlice';
import { restoreSellerSession, type SellerUser } from '@/store/slices/sellerAuthSlice';
import { restoreAdminSession, type AdminUser } from '@/store/slices/adminAuthSlice';

const AUTH_STORAGE_KEY = 'prinzex_auth_user';
const SELLER_STORAGE_KEY = 'prinzex_seller_user';
const ADMIN_STORAGE_KEY = 'prinzex_admin_user';

/**
 * Single QueryClient instance for the whole app. Created lazily inside
 * `useState` so it survives re-renders but is never shared between requests.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Restores the persisted session, then keeps localStorage in sync with Redux.
 * This fixes the "refresh logs you out" issue called out in the project docs.
 */
function SessionBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const parsed: AuthUser | null = raw ? JSON.parse(raw) : null;
      if (parsed) store.dispatch(restoreSession(parsed));
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    try {
      const raw = window.localStorage.getItem(SELLER_STORAGE_KEY);
      const parsed: SellerUser | null = raw ? JSON.parse(raw) : null;
      if (parsed) store.dispatch(restoreSellerSession(parsed));
    } catch {
      window.localStorage.removeItem(SELLER_STORAGE_KEY);
    }

    try {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      const parsed: AdminUser | null = raw ? JSON.parse(raw) : null;
      if (parsed) store.dispatch(restoreAdminSession(parsed));
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }

    return store.subscribe(() => {
      const { auth, sellerAuth, adminAuth } = store.getState();
      try {
        if (auth.user) {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth.user));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }

        if (sellerAuth.seller) {
          window.localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(sellerAuth.seller));
        } else {
          window.localStorage.removeItem(SELLER_STORAGE_KEY);
        }

        if (adminAuth.admin) {
          window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAuth.admin));
        } else {
          window.localStorage.removeItem(ADMIN_STORAGE_KEY);
        }
      } catch {
        /* storage unavailable (private mode) — session stays in memory */
      }
    });
  }, []);

  return <>{children}</>;
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SessionBridge>{children}</SessionBridge>
      </QueryClientProvider>
    </Provider>
  );
}
