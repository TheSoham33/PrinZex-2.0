/** Payout queues, content records, admin accounts and activity log. */

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

export interface PayoutBreakdownRow {
  orderId: string;
  orderTotal: number;
  commission: number;
  net: number;
}

export interface SellerPayout {
  id: string;
  storeName: string;
  sellerId: string;
  amount: number;
  ordersIncluded: number;
  status: PayoutStatus;
  requestedAt: string;
  bankAccount: string;
  breakdown: PayoutBreakdownRow[];
}

export interface DeliveryPayout {
  id: string;
  name: string;
  deliveryBoyId: string;
  amount: number;
  deliveriesIncluded: number;
  status: PayoutStatus;
  date: string;
  bankAccount: string;
  breakdown: PayoutBreakdownRow[];
}






/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export interface Banner {
  id: string;
  title: string;
  linkUrl: string;
  active: boolean;
  color: string;
}


export interface ServiceCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  active: boolean;
  serviceCount: number;
}


export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  active: boolean;
  color: string;
}


export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  name: string;
  items: FaqItem[];
}


/* ------------------------------------------------------------------ */
/* Admin accounts, commission, activity log                            */
/* ------------------------------------------------------------------ */

import type { AdminRole } from '@/store/slices/adminAuthSlice';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastLogin: string;
  active: boolean;
  invited?: boolean;
}


export interface CommissionRow {
  categoryId: string;
  category: string;
  rate: number;
}


export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: AdminRole;
  action: string;
  entity: string;
  ip: string;
}

