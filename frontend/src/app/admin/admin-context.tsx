'use client';

import { createContext, useContext } from 'react';
import { useAppSelector } from '@/store/hooks';
import type { AdminPermissions } from '@/store/slices/adminAuthSlice';

export interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

/**
 * Permission check for the signed-in admin. Used to gate nav items, page
 * actions, and whole pages.
 */
export function usePermission(permission: keyof AdminPermissions): boolean {
  const admin = useAppSelector((state) => state.adminAuth.admin);
  return Boolean(admin?.permissions[permission]);
}
