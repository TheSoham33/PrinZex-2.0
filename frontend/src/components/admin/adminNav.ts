import type { SVGProps } from 'react';
import type { AdminPermissions } from '@/store/slices/adminAuthSlice';
import {
  IconArchive,
  IconFileEdit,
  IconHeadphones,
  IconLayoutDashboard,
  IconPackage,
  IconSettings,
  IconStore,
  IconTruck,
  IconUsers,
  IconWallet,
} from '@/components/icons';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  /** null = always visible. */
  permission: keyof AdminPermissions | null;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: IconLayoutDashboard, permission: null },
  { href: '/admin/users', label: 'Users', icon: IconUsers, permission: 'canManageUsers' },
  { href: '/admin/sellers', label: 'Sellers', icon: IconStore, permission: 'canManageSellers' },
  { href: '/admin/delivery', label: 'Delivery boys', icon: IconTruck, permission: 'canManageUsers' },
  { href: '/admin/orders', label: 'Orders', icon: IconPackage, permission: 'canManageOrders' },
  { href: '/admin/payouts', label: 'Payouts', icon: IconWallet, permission: 'canManagePayouts' },
  { href: '/admin/content', label: 'Content', icon: IconFileEdit, permission: 'canManageContent' },
  { href: '/admin/support', label: 'Support', icon: IconHeadphones, permission: 'canManageOrders' },
  { href: '/admin/settings', label: 'Settings', icon: IconSettings, permission: 'canManageAdmins' },
];

export const SIDEBAR_STORAGE_KEY = 'prinzex_admin_sidebar_collapsed';

export { IconArchive };
