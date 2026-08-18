/** Seller analytics domain types + deterministically generated mock series. */

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

/**
 * Small deterministic PRNG. Using a fixed seed keeps the "random" daily
 * variation identical between server render and client hydration, which a
 * `Math.random()` based generator would not.
 */
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const DAYS = 60;

function buildSeries(): DailyRevenue[] {
  const random = seededRandom(20260727);
  const series: DailyRevenue[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const weekday = date.getDay();

    // Weekends are quieter; Mondays and Fridays peak.
    const weekendFactor = weekday === 0 ? 0.45 : weekday === 6 ? 0.72 : 1;
    const peakFactor = weekday === 1 || weekday === 5 ? 1.18 : 1;
    // Gentle upward trend across the window.
    const trend = 1 + ((DAYS - offset) / DAYS) * 0.35;
    const noise = 0.78 + random() * 0.44;

    const orders = Math.max(
      1,
      Math.round(11 * weekendFactor * peakFactor * trend * noise),
    );
    const averageTicket = 420 + random() * 520;
    const revenue = Math.round(orders * averageTicket);

    series.push({
      date: date.toISOString().slice(0, 10),
      revenue,
      orders,
    });
  }

  return series;
}

const SERIES = buildSeries();

/** Rows falling inside the current calendar month. */
const thisMonthRows = SERIES.filter((row) => {
  const date = new Date(row.date);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
});

const monthRevenue = thisMonthRows.reduce((sum, row) => sum + row.revenue, 0);
const monthOrders = thisMonthRows.reduce((sum, row) => sum + row.orders, 0);

export const MOCK_SELLER_ANALYTICS: SellerAnalytics = {
  totalRevenueThisMonth: monthRevenue,
  totalOrdersThisMonth: monthOrders,
  averageOrderValue: monthOrders > 0 ? Math.round(monthRevenue / monthOrders) : 0,
  completionRate: 94.2,
  averageRating: 4.8,
  onTimeDeliveryPct: 91.6,
  revenueByDay: SERIES,
  ordersByDay: SERIES,
  serviceBreakdown: [
    { service: 'Printing', count: 184, revenue: 96400 },
    { service: 'B&W Xerox', count: 240, revenue: 38200 },
    { service: 'Business Cards', count: 96, revenue: 61800 },
    { service: 'Banners', count: 52, revenue: 74300 },
    { service: 'Binding', count: 118, revenue: 27600 },
    { service: 'Stickers', count: 74, revenue: 21900 },
  ],
};

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
 * Slice the seeded series for a range. Pure client-side filtering — the brief
 * requires no extra "API" call when the selector changes.
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
