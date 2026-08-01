import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AdminRole =
  | 'super_admin'
  | 'ops_manager'
  | 'support_agent'
  | 'finance_manager'
  | 'content_manager';

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageSellers: boolean;
  canManageOrders: boolean;
  canManagePayouts: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageAdmins: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
}

export interface AdminAuthState {
  admin: AdminUser | null;
  status: 'idle' | 'loading';
}

const NONE: AdminPermissions = {
  canManageUsers: false,
  canManageSellers: false,
  canManageOrders: false,
  canManagePayouts: false,
  canManageContent: false,
  canViewAnalytics: false,
  canManageAdmins: false,
};

/** Single source of truth for what each role may do. */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canManageUsers: true,
    canManageSellers: true,
    canManageOrders: true,
    canManagePayouts: true,
    canManageContent: true,
    canViewAnalytics: true,
    canManageAdmins: true,
  },
  ops_manager: {
    ...NONE,
    canManageUsers: true,
    canManageSellers: true,
    canManageOrders: true,
    canViewAnalytics: true,
  },
  support_agent: { ...NONE, canManageOrders: true },
  finance_manager: { ...NONE, canManagePayouts: true, canViewAnalytics: true },
  content_manager: { ...NONE, canManageContent: true },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  ops_manager: 'Ops manager',
  support_agent: 'Support agent',
  finance_manager: 'Finance manager',
  content_manager: 'Content manager',
};

export const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  super_admin: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  ops_manager: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  support_agent: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  finance_manager: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  content_manager: 'bg-pink-50 text-pink-700 ring-pink-600/20',
};

/** Build an admin session for a real signed-in user. */
export function buildAdmin(
  role: AdminRole,
  user: { id: string; name: string; email: string },
): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

const initialState: AdminAuthState = { admin: null, status: 'idle' };

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminLoginStart(state) {
      state.status = 'loading';
    },
    adminLoginSuccess(state, action: PayloadAction<AdminUser>) {
      state.admin = action.payload;
      state.status = 'idle';
    },
    adminLoginFailure(state) {
      state.status = 'idle';
    },
    adminLogout(state) {
      state.admin = null;
      state.status = 'idle';
    },
    restoreAdminSession(state, action: PayloadAction<AdminUser | null>) {
      state.admin = action.payload;
      state.status = 'idle';
    },
  },
});

export const {
  adminLoginStart,
  adminLoginSuccess,
  adminLoginFailure,
  adminLogout,
  restoreAdminSession,
} = adminAuthSlice.actions;

export default adminAuthSlice.reducer;
