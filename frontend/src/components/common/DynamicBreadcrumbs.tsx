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

interface DynamicBreadcrumbsProps {
  sellerDashboard?: boolean;
}

export default function DynamicBreadcrumbs({ sellerDashboard = false }: DynamicBreadcrumbsProps) {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on the homepage
  if (pathname === '/') return null;
  
  const allSegments = pathname.split('/').filter(Boolean);
  const segments = sellerDashboard ? allSegments.slice(2) : allSegments;
  
  const generatedItems: BreadcrumbItem[] = segments.map((segment, index) => {
    const sourceIndex = sellerDashboard ? index + 2 : index;
    const href = `/${allSegments.slice(0, sourceIndex + 1).join('/')}`;
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

  if (!sellerDashboard) {
    return <Breadcrumbs items={generatedItems} />;
  }

  const isOrdersPage = segments.length === 1 && segments[0] === 'orders';
  const items: BreadcrumbItem[] = isOrdersPage
    ? [{ label: 'Orders', active: true }]
    : [
        { label: 'Orders', href: '/seller/dashboard/orders' },
        ...generatedItems.filter((item) => item.label !== 'Orders'),
      ];

  return <Breadcrumbs items={items} showHome={false} />;
}
