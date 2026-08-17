'use client';

import { usePathname } from 'next/navigation';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';

/**
 * Automatically generates breadcrumbs based on the current URL path.
 * Maps common path segments to readable labels.
 */
const LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  tracking: 'Tracking',
  wallet: 'Wallet',
  addresses: 'Addresses',
  notifications: 'Notifications',
  profile: 'Profile',
  stores: 'Stores',
  services: 'Services',
  order: 'Order',
  admin: 'Admin',
  content: 'Content',
  delivery: 'Delivery',
  sellers: 'Sellers',
  support: 'Support',
  settings: 'Settings',
  payouts: 'Payouts',
};

export default function DynamicBreadcrumbs() {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on the homepage
  if (pathname === '/') return null;
  
  const segments = pathname.split('/').filter(Boolean);
  
  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;
    
    // Check if segment is a CUID/UUID (likely an ID)
    const isId = segment.length > 20 || (segment.startsWith('cms') && segment.length > 15);
    
    let label = LABEL_MAP[segment] || segment;
    
    if (isId) {
      label = 'Detail';
    } else {
      // Capitalize first letter if not in map
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    
    return {
      label,
      href: isLast ? undefined : href,
      active: isLast,
    };
  });

  return <Breadcrumbs items={items} />;
}
