/** Platform-wide analytics domain types. */

export interface PlatformDaily {
  date: string;
  revenue: number;
  orders: number;
}

export type ActivityKind = 'seller' | 'order' | 'ticket' | 'payout' | 'user';

export interface PlatformActivity {
  id: string;
  kind: ActivityKind;
  message: string;
  timestamp: string;
  href: string;
}

export interface PlatformKpis {
  totalUsers: number;
  usersGrowthPct: number | null;
  totalSellers: number;
  pendingSellers: number;
  ordersToday: number;
  ordersYesterday: number;
  revenueToday: number;
  revenueYesterdayPct: number | null;
  activeDeliveries: number;
  openTickets: number;
}

export interface PlatformAnalytics {
  kpis: PlatformKpis;
  daily: PlatformDaily[];
  activity: PlatformActivity[];
}
