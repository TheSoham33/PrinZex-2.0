/** Platform-wide KPIs, chart series and the dashboard activity feed. */

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
  usersGrowthPct: number;
  totalSellers: number;
  pendingSellers: number;
  ordersToday: number;
  ordersYesterday: number;
  revenueToday: number;
  revenueYesterdayPct: number;
  activeDeliveries: number;
  openTickets: number;
}

export interface PlatformAnalytics {
  kpis: PlatformKpis;
  daily: PlatformDaily[];
  activity: PlatformActivity[];
}

/** Deterministic PRNG so server and client render identical numbers. */
function seeded(seed: number): () => number {
  let v = seed;
  return () => {
    v = (v * 1664525 + 1013904223) % 4294967296;
    return v / 4294967296;
  };
}

function buildDaily(): PlatformDaily[] {
  const rand = seeded(20260728);
  const out: PlatformDaily[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const weekday = date.getDay();
    const weekendFactor = weekday === 0 ? 0.5 : weekday === 6 ? 0.78 : 1;
    const peak = weekday === 1 || weekday === 5 ? 1.15 : 1;
    const trend = 1 + ((30 - offset) / 30) * 0.4;
    const noise = 0.82 + rand() * 0.36;

    const orders = Math.max(20, Math.round(180 * weekendFactor * peak * trend * noise));
    const revenue = Math.round(orders * (520 + rand() * 380));
    out.push({ date: date.toISOString().slice(0, 10), revenue, orders });
  }
  return out;
}

const DAILY = buildDaily();
const todayRow = DAILY[DAILY.length - 1];
const yesterdayRow = DAILY[DAILY.length - 2];

export const MOCK_PLATFORM_ANALYTICS: PlatformAnalytics = {
  kpis: {
    totalUsers: 18426,
    usersGrowthPct: 12.4,
    totalSellers: 7,
    pendingSellers: 3,
    ordersToday: todayRow.orders,
    ordersYesterday: yesterdayRow.orders,
    revenueToday: todayRow.revenue,
    revenueYesterdayPct:
      Math.round(((todayRow.revenue - yesterdayRow.revenue) / yesterdayRow.revenue) * 1000) / 10,
    activeDeliveries: 34,
    openTickets: 4,
  },
  daily: DAILY,
  activity: [
    { id: 'ACT-1', kind: 'seller', message: 'New seller registered: Howrah Print House', timestamp: '2026-07-27T10:55:00+05:30', href: '/admin/sellers' },
    { id: 'ACT-2', kind: 'order', message: 'Order ORD-4417 placed — rush, ₹1,840', timestamp: '2026-07-27T10:48:00+05:30', href: '/admin/orders/ORD-4417' },
    { id: 'ACT-3', kind: 'ticket', message: 'Support ticket T-441 opened — quality dispute', timestamp: '2026-07-27T09:12:00+05:30', href: '/admin/support' },
    { id: 'ACT-4', kind: 'payout', message: 'Payout ₹4,200 sent to Sharma Prints', timestamp: '2026-07-27T08:40:00+05:30', href: '/admin/payouts' },
    { id: 'ACT-5', kind: 'seller', message: 'New seller registered: Colorcraft Studio', timestamp: '2026-07-26T16:20:00+05:30', href: '/admin/sellers' },
    { id: 'ACT-6', kind: 'order', message: 'Order ORD-4390 delivered to Arjun Mitra', timestamp: '2026-07-26T13:20:00+05:30', href: '/admin/orders/ORD-4390' },
    { id: 'ACT-7', kind: 'user', message: 'User account blocked: Sourav Das', timestamp: '2026-07-26T12:05:00+05:30', href: '/admin/users' },
    { id: 'ACT-8', kind: 'payout', message: 'Payout batch PO-S-5008 moved to processing', timestamp: '2026-07-26T09:30:00+05:30', href: '/admin/payouts' },
    { id: 'ACT-9', kind: 'ticket', message: 'Ticket T-430 resolved by Aditi Verma', timestamp: '2026-07-25T10:25:00+05:30', href: '/admin/support' },
    { id: 'ACT-10', kind: 'order', message: 'Refund ₹720 issued for ORD-4381', timestamp: '2026-07-24T19:30:00+05:30', href: '/admin/orders/ORD-4381' },
  ],
};
