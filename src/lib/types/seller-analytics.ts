/**
 * Seller analytics domain types + date-range helpers.
 * The actual series is produced by the backend (`/api/seller/analytics`), not
 * generated client-side from seeded demo values.
 */

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface ServiceBreakdown {
  service: string;
  count: number;
  revenue: number;
}

export interface SellerAnalytics {
  totalRevenueThisMonth: number;
  totalOrdersThisMonth: number;
  averageOrderValue: number;
  completionRate: number;
  averageRating: number;
  onTimeDeliveryPct: number;
  /** Last 60 days, oldest first — long enough to compare period-over-period. */
  revenueByDay: DailyRevenue[];
  ordersByDay: DailyRevenue[];
  serviceBreakdown: ServiceBreakdown[];
}

export type DateRangeKey = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom range' },
];

export interface RangeResult {
  current: DailyRevenue[];
  /** Equivalent-length window immediately before `current`, for % change. */
  previous: DailyRevenue[];
}

/**
 * Slice a series for a range. Pure client-side filtering — no extra API call
 * when the selector changes.
 */
export function sliceRange(
  series: DailyRevenue[],
  range: DateRangeKey,
  customFrom?: string,
  customTo?: string,
): RangeResult {
  if (range === 'custom' && customFrom && customTo) {
    const current = series.filter((row) => row.date >= customFrom && row.date <= customTo);
    const span = Math.max(current.length, 1);
    const startIndex = series.findIndex((row) => row.date === current[0]?.date);
    const previous =
      startIndex > 0 ? series.slice(Math.max(0, startIndex - span), startIndex) : [];
    return { current, previous };
  }

  if (range === 'thisMonth' || range === 'lastMonth') {
    const today = new Date();
    const targetMonth = range === 'thisMonth' ? today.getMonth() : today.getMonth() - 1;
    const reference = new Date(today.getFullYear(), targetMonth, 1);

    const inMonth = (row: DailyRevenue, monthDate: Date) => {
      const date = new Date(row.date);
      return (
        date.getMonth() === monthDate.getMonth() &&
        date.getFullYear() === monthDate.getFullYear()
      );
    };

    const previousMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    return {
      current: series.filter((row) => inMonth(row, reference)),
      previous: series.filter((row) => inMonth(row, previousMonth)),
    };
  }

  const span = range === 'last7' ? 7 : 30;
  return {
    current: series.slice(-span),
    previous: series.slice(-span * 2, -span),
  };
}

/** Percentage change between two totals, guarding divide-by-zero. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
