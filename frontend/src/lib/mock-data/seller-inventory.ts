/** Inventory, payouts, pricing, reviews and team mock data for the seller hub. */

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  lastRestocked: string;
}

export const INVENTORY_CATEGORIES = [
  'Paper',
  'Ink & Toner',
  'Binding',
  'Lamination',
  'Large format',
  'Packaging',
];

export const INVENTORY_UNITS = ['reams', 'cartridges', 'rolls', 'boxes', 'packs', 'sheets'];

/** 10 items — 3 of them deliberately below threshold. */
export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'A4 Bond Paper (500 sheets)',
    category: 'Paper',
    currentStock: 48,
    unit: 'reams',
    lowStockThreshold: 20,
    lastRestocked: '2026-07-18',
  },
  {
    id: 'inv-2',
    name: 'A3 Art Paper 130 GSM',
    category: 'Paper',
    currentStock: 6,
    unit: 'reams',
    lowStockThreshold: 15,
    lastRestocked: '2026-06-29',
  },
  {
    id: 'inv-3',
    name: 'Cyan Toner Cartridge',
    category: 'Ink & Toner',
    currentStock: 3,
    unit: 'cartridges',
    lowStockThreshold: 4,
    lastRestocked: '2026-07-02',
  },
  {
    id: 'inv-4',
    name: 'Black Toner Cartridge',
    category: 'Ink & Toner',
    currentStock: 11,
    unit: 'cartridges',
    lowStockThreshold: 5,
    lastRestocked: '2026-07-21',
  },
  {
    id: 'inv-5',
    name: 'Magenta Toner Cartridge',
    category: 'Ink & Toner',
    currentStock: 5,
    unit: 'cartridges',
    lowStockThreshold: 4,
    lastRestocked: '2026-07-09',
  },
  {
    id: 'inv-6',
    name: 'Spiral Binding Combs (10 mm)',
    category: 'Binding',
    currentStock: 240,
    unit: 'packs',
    lowStockThreshold: 50,
    lastRestocked: '2026-07-15',
  },
  {
    id: 'inv-7',
    name: 'Lamination Film 125 Micron',
    category: 'Lamination',
    currentStock: 2,
    unit: 'rolls',
    lowStockThreshold: 6,
    lastRestocked: '2026-06-24',
  },
  {
    id: 'inv-8',
    name: 'Outdoor Vinyl Flex Roll',
    category: 'Large format',
    currentStock: 9,
    unit: 'rolls',
    lowStockThreshold: 4,
    lastRestocked: '2026-07-20',
  },
  {
    id: 'inv-9',
    name: 'Corrugated Shipping Boxes',
    category: 'Packaging',
    currentStock: 130,
    unit: 'boxes',
    lowStockThreshold: 40,
    lastRestocked: '2026-07-12',
  },
  {
    id: 'inv-10',
    name: '350 GSM Card Stock',
    category: 'Paper',
    currentStock: 22,
    unit: 'packs',
    lowStockThreshold: 10,
    lastRestocked: '2026-07-23',
  },
];

/* ------------------------------------------------------------------ */
/* Payouts                                                             */
/* ------------------------------------------------------------------ */

export interface Payout {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'processing';
  date: string;
  ordersIncluded: number;
  /** Masked account, e.g. "●●●●1234". */
  bankAccount: string;
}

export const PAYOUT_STATUS_STYLES: Record<Payout['status'], string> = {
  paid: 'bg-green-50 text-green-700 ring-green-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  processing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

export const MOCK_PAYOUTS: Payout[] = [
  {
    id: 'PO-20260727',
    amount: 18640,
    status: 'pending',
    date: '2026-08-03',
    ordersIncluded: 34,
    bankAccount: '●●●●1234',
  },
  {
    id: 'PO-20260720',
    amount: 22180,
    status: 'processing',
    date: '2026-07-27',
    ordersIncluded: 41,
    bankAccount: '●●●●1234',
  },
  {
    id: 'PO-20260713',
    amount: 19750,
    status: 'paid',
    date: '2026-07-20',
    ordersIncluded: 37,
    bankAccount: '●●●●1234',
  },
  {
    id: 'PO-20260706',
    amount: 16420,
    status: 'paid',
    date: '2026-07-13',
    ordersIncluded: 29,
    bankAccount: '●●●●1234',
  },
  {
    id: 'PO-20260629',
    amount: 24310,
    status: 'paid',
    date: '2026-07-06',
    ordersIncluded: 46,
    bankAccount: '●●●●1234',
  },
  {
    id: 'PO-20260622',
    amount: 14980,
    status: 'paid',
    date: '2026-06-29',
    ordersIncluded: 27,
    bankAccount: '●●●●1234',
  },
];

export const COMMISSION_RATE = 12;
export const PENDING_BALANCE = 18640;
export const NEXT_PAYOUT_DATE = '2026-08-03';

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export interface SellerPricingEntry {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  unit: string;
}

export const MOCK_SELLER_PRICING: SellerPricingEntry[] = [
  { serviceId: 'doc-print', serviceName: 'Printing', basePrice: 1.5, unit: 'per page' },
  { serviceId: 'doc-xerox', serviceName: 'Photocopy / Xerox', basePrice: 1, unit: 'per page' },
  {
    serviceId: 'stat-visiting-cards',
    serviceName: 'Visiting Cards',
    basePrice: 3,
    unit: 'per piece',
  },
  { serviceId: 'bind-spiral', serviceName: 'Spiral Binding', basePrice: 40, unit: 'per piece' },
  { serviceId: 'lf-flex-banner', serviceName: 'Flex Banners', basePrice: 45, unit: 'per sq ft' },
];

export interface BulkTier {
  id: string;
  minQty: number;
  /** null = open-ended upper bound ("100+"). */
  maxQty: number | null;
  discountPct: number;
}

export const MOCK_BULK_TIERS: BulkTier[] = [
  { id: 'tier-1', minQty: 10, maxQty: 49, discountPct: 5 },
  { id: 'tier-2', minQty: 50, maxQty: 99, discountPct: 10 },
  { id: 'tier-3', minQty: 100, maxQty: null, discountPct: 15 },
];

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export interface SellerReview {
  id: string;
  customerName: string;
  avatarInitials: string;
  rating: number;
  date: string;
  comment: string;
  /** null = not yet answered by the seller. */
  reply: string | null;
}

export const MOCK_SELLER_REVIEWS: SellerReview[] = [
  {
    id: 'rev-1',
    customerName: 'Ananya Sen',
    avatarInitials: 'AS',
    rating: 5,
    date: '2026-07-24',
    comment:
      'Printed 400 pages of my thesis here. Binding was neat, colours were sharp and they delivered a day earlier than promised.',
    reply: 'Thank you Ananya! Best of luck with your submission — do come back for the hard binding.',
  },
  {
    id: 'rev-2',
    customerName: 'Rahul Banerjee',
    avatarInitials: 'RB',
    rating: 5,
    date: '2026-07-21',
    comment: 'Sent the file at 11 AM and picked up the banners by 4 PM the same day. Superb service.',
    reply: null,
  },
  {
    id: 'rev-3',
    customerName: 'Priyanka Ghosh',
    avatarInitials: 'PG',
    rating: 4,
    date: '2026-07-18',
    comment: 'Good quality prints at a fair price. The shop does get crowded in the evening though.',
    reply: null,
  },
  {
    id: 'rev-4',
    customerName: 'Tanisha Paul',
    avatarInitials: 'TP',
    rating: 3,
    date: '2026-07-12',
    comment: 'Prints were fine but delivery took longer than the estimate over the weekend.',
    reply: 'Sorry about the delay Tanisha — our Sunday courier slot was full. We have added a second partner since.',
  },
  {
    id: 'rev-5',
    customerName: 'Sourav Das',
    avatarInitials: 'SD',
    rating: 5,
    date: '2026-07-08',
    comment: 'Xerox rates are the best in Salt Lake and the staff is quick and polite.',
    reply: null,
  },
  {
    id: 'rev-6',
    customerName: 'Meghna Roy',
    avatarInitials: 'MR',
    rating: 2,
    date: '2026-06-30',
    comment: 'Six of my laminated sheets had bubbles. Had to get them redone.',
    reply: null,
  },
];

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export type TeamRole = 'manager' | 'operator' | 'support';

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export const TEAM_ROLE_STYLES: Record<TeamRole, string> = {
  manager: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  operator: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  support: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export const MOCK_TEAM: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Rajesh Kumar',
    role: 'manager',
    email: 'rajesh@demoprintshop.in',
    phone: '+91 98300 12345',
    status: 'active',
    joinedAt: '2024-03-14',
  },
  {
    id: 'tm-2',
    name: 'Sneha Dutta',
    role: 'operator',
    email: 'sneha@demoprintshop.in',
    phone: '+91 98311 66201',
    status: 'active',
    joinedAt: '2025-01-22',
  },
  {
    id: 'tm-3',
    name: 'Imran Sheikh',
    role: 'support',
    email: 'imran@demoprintshop.in',
    phone: '+91 98362 55118',
    status: 'inactive',
    joinedAt: '2025-09-05',
  },
];
