import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageSellers: boolean;
  canManageOrders: boolean;
  canManagePayouts: boolean;
  canManageContent: boolean;
  canManageAdmins: boolean;
  [key: string]: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: AdminPermissions;
}

export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminAuthState {
  admin: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading';
}

/** UI display labels for internal admin roles. */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPS_MANAGER: 'Operations Manager',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_MANAGER: 'Finance Manager',
  CONTENT_MANAGER: 'Content Manager',
};

/** Tailwind ring + text styles for the role badge. */
export const ROLE_BADGE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  OPS_MANAGER: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  SUPPORT_AGENT: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  FINANCE_MANAGER: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CONTENT_MANAGER: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

const initialState: AdminAuthState = {
  admin: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminLoginStart(state) {
      state.status = 'loading';
    },
    adminLoginSuccess(state, action: PayloadAction<{ admin: AdminUser; tokens: AdminAuthTokens }>) {
      state.admin = action.payload.admin;
      if (action.payload.tokens) {
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
      }
      state.status = 'idle';
    },
    adminLogout(state) {
      state.admin = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
    },
    restoreAdminSession(state, action: PayloadAction<AdminAuthState | null>) {
      if (action.payload) {
        state.admin = action.payload.admin;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      }
      state.status = 'idle';
    },
  },
});

export const { adminLoginStart, adminLoginSuccess, adminLogout, restoreAdminSession } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
