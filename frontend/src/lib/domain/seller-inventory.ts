/** Inventory, payouts, pricing, reviews and team domain types + UI constants. */

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



/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export interface SellerPricingEntry {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  unit: string;
  /** Minimum order quantity the customer must place (default 1). */
  minQuantity?: number;
}


export interface BulkTier {
  id: string;
  minQty: number;
  /** null = open-ended upper bound ("100+"). */
  maxQty: number | null;
  discountPct: number;
}


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

