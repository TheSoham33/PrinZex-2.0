import { get } from './client';
import { fetchActivityLogs } from './admin-logs';
import type {
  PlatformAnalytics,
  PlatformActivity,
  PlatformDaily,
  PlatformKpis,
} from '@/lib/domain/admin-analytics';

interface AdminKpi {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalApprovedSellers: number;
  pendingSellersCount: number;
  totalOrdersToday: number;
  totalOrdersThisMonth: number;
  totalRevenueToday: number;
  totalRevenueThisMonth: number;
  activeDeliveries: number;
  openSupportTickets: number;
  averageOrderValue: number;
  platformCommissionThisMonth: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
  commission: number;
}

/** Map an activity-log row into the dashboard feed item shape. */
function toActivity(row: any): PlatformActivity {
  const entityType = String(row?.entityType ?? 'order');
  const kind =
    entityType === 'seller'
      ? 'seller'
      : entityType === 'order'
        ? 'order'
        : entityType === 'payout'
          ? 'payout'
          : entityType === 'ticket' || entityType === 'support'
            ? 'ticket'
            : 'user';

  const id = String(row?._id ?? row?.id ?? `${entityType}-${Date.now()}`);
  const action = String(row?.action ?? '').replace(/_/g, ' ');

  let href = '/admin';
  if (entityType === 'seller') href = `/admin/sellers/${row?.entityId ?? ''}`;
  else if (entityType === 'order') href = `/admin/orders/${row?.entityId ?? ''}`;
  else if (entityType === 'payout') href = '/admin/payouts';
  else if (entityType === 'ticket' || entityType === 'support') href = '/admin/support';
  else href = '/admin/users';

  return {
    id,
    kind,
    message: action || entityType,
    timestamp: row?.createdAt ?? new Date().toISOString(),
    href,
  };
}

/**
 * Platform dashboard analytics — KPIs + revenue series + recent activity,
 * assembled from the real backend endpoints.
 */
export const fetchPlatformAnalytics = async (): Promise<PlatformAnalytics> => {
  const [kpi, revenue, activityRows] = await Promise.all([
    get<AdminKpi>('/admin/analytics/kpi'),
    get<RevenuePoint[]>('/admin/analytics/revenue', { period: '30d', groupBy: 'day' }),
    fetchActivityLogs({ limit: 10 }).catch(() => []),
  ]);

  const kpis: PlatformKpis = {
    totalUsers: kpi?.totalCustomers ?? 0,
    usersGrowthPct: null, // not derivable from the current KPI payload
    totalSellers: kpi?.totalApprovedSellers ?? 0,
    pendingSellers: kpi?.pendingSellersCount ?? 0,
    ordersToday: kpi?.totalOrdersToday ?? 0,
    ordersYesterday: 0, // not in the KPI payload
    revenueToday: kpi?.totalRevenueToday ?? 0,
    revenueYesterdayPct: null,
    activeDeliveries: kpi?.activeDeliveries ?? 0,
    openTickets: kpi?.openSupportTickets ?? 0,
  };

  const daily: PlatformDaily[] = (revenue ?? []).map((point) => ({
    date: point.date,
    revenue: Number(point.revenue ?? 0),
    orders: Number(point.orders ?? 0),
  }));

  const activity: PlatformActivity[] = (activityRows ?? [])
    .slice(0, 10)
    .map(toActivity);

  return { kpis, daily, activity };
};
