'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setStore } from '@/lib/api/client';
import { restoreSession, type AuthState } from '@/store/slices/authSlice';
import { restoreSellerSession, type SellerAuthState } from '@/store/slices/sellerAuthSlice';
import { restoreAdminSession, type AdminAuthState } from '@/store/slices/adminAuthSlice';

setStore(store);

const AUTH_STORAGE_KEY = 'prinzex_auth_state';
const SELLER_STORAGE_KEY = 'prinzex_seller_state';
const ADMIN_STORAGE_KEY = 'prinzex_admin_state';

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

function SessionBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) store.dispatch(restoreSession(JSON.parse(raw)));
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    try {
      const raw = window.localStorage.getItem(SELLER_STORAGE_KEY);
      if (raw) store.dispatch(restoreSellerSession(JSON.parse(raw)));
    } catch {
      window.localStorage.removeItem(SELLER_STORAGE_KEY);
    }

    try {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) store.dispatch(restoreAdminSession(JSON.parse(raw)));
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }

    return store.subscribe(() => {
      const { auth, sellerAuth, adminAuth } = store.getState();
      try {
        if (auth.user) {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }

        if (sellerAuth.seller) {
          window.localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(sellerAuth));
        } else {
          window.localStorage.removeItem(SELLER_STORAGE_KEY);
        }

        if (adminAuth.admin) {
          window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAuth));
        } else {
          window.localStorage.removeItem(ADMIN_STORAGE_KEY);
        }
      } catch {
        /* storage unavailable */
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
