/** Seller analytics domain types + date-range UI options. */

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

export type DateRangeKey = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom range' },
];
