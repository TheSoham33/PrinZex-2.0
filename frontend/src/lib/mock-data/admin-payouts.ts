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

const bd = (rows: [string, number, number][]): PayoutBreakdownRow[] =>
  rows.map(([orderId, orderTotal, commission]) => ({
    orderId,
    orderTotal,
    commission,
    net: orderTotal - commission,
  }));

export const MOCK_SELLER_PAYOUTS: SellerPayout[] = [
  { id: 'PO-S-5011', storeName: 'Print Master Pro', sellerId: 'SLR-201', amount: 18640, ordersIncluded: 34, status: 'pending', requestedAt: '2026-07-27T06:00:00+05:30', bankAccount: '●●●●1234', breakdown: bd([['ORD-4402', 3100, 372], ['ORD-4362', 1280, 154], ['ORD-1122', 300, 36]]) },
  { id: 'PO-S-5010', storeName: 'Elite Press Studio', sellerId: 'SLR-203', amount: 42310, ordersIncluded: 51, status: 'pending', requestedAt: '2026-07-27T06:00:00+05:30', bankAccount: '●●●●7788', breakdown: bd([['ORD-4399', 8750, 875], ['ORD-4405', 4200, 420], ['ORD-4412', 2250, 225]]) },
  { id: 'PO-S-5009', storeName: 'Banner Bazaar', sellerId: 'SLR-207', amount: 12800, ordersIncluded: 22, status: 'pending', requestedAt: '2026-07-27T06:00:00+05:30', bankAccount: '●●●●4402', breakdown: bd([['ORD-4416', 1620, 178]]) },
  { id: 'PO-S-5008', storeName: 'Quick Copy Hub', sellerId: 'SLR-202', amount: 9420, ordersIncluded: 46, status: 'processing', requestedAt: '2026-07-26T06:00:00+05:30', bankAccount: '●●●●3311', breakdown: bd([['ORD-4410', 980, 118], ['ORD-4415', 480, 58]]) },
  { id: 'PO-S-5007', storeName: 'Signature Stationers', sellerId: 'SLR-208', amount: 8900, ordersIncluded: 19, status: 'processing', requestedAt: '2026-07-26T06:00:00+05:30', bankAccount: '●●●●9021', breakdown: bd([['ORD-4375', 640, 77]]) },
  { id: 'PO-S-5006', storeName: 'Sharma Prints', sellerId: 'SLR-205', amount: 4200, ordersIncluded: 11, status: 'paid', requestedAt: '2026-07-20T06:00:00+05:30', bankAccount: '●●●●6650', breakdown: bd([['ORD-4362', 1280, 154]]) },
  { id: 'PO-S-5005', storeName: 'Print Master Pro', sellerId: 'SLR-201', amount: 22180, ordersIncluded: 41, status: 'paid', requestedAt: '2026-07-20T06:00:00+05:30', bankAccount: '●●●●1234', breakdown: bd([]) },
  { id: 'PO-S-5004', storeName: 'Campus Print Point', sellerId: 'SLR-206', amount: 3100, ordersIncluded: 8, status: 'failed', requestedAt: '2026-07-19T06:00:00+05:30', bankAccount: '●●●●7742', breakdown: bd([]) },
];

export const MOCK_DELIVERY_PAYOUTS: DeliveryPayout[] = [
  { id: 'PO-D-7011', name: 'Sujoy Mondal', deliveryBoyId: 'DLV-301', amount: 4820, deliveriesIncluded: 84, status: 'pending', date: '2026-07-27', bankAccount: '●●●●4471', breakdown: bd([['ORD-4402', 60, 0], ['ORD-4375', 45, 0]]) },
  { id: 'PO-D-7010', name: 'Rakesh Yadav', deliveryBoyId: 'DLV-302', amount: 6140, deliveriesIncluded: 102, status: 'pending', date: '2026-07-27', bankAccount: '●●●●8829', breakdown: bd([['ORD-4399', 80, 0], ['ORD-4390', 55, 0]]) },
  { id: 'PO-D-7009', name: 'Sanjay Bera', deliveryBoyId: 'DLV-305', amount: 3980, deliveriesIncluded: 47, status: 'processing', date: '2026-07-26', bankAccount: '●●●●3315', breakdown: bd([['ORD-4362', 90, 0]]) },
  { id: 'PO-D-7008', name: 'Tapas Ghosh', deliveryBoyId: 'DLV-308', amount: 5210, deliveriesIncluded: 91, status: 'processing', date: '2026-07-26', bankAccount: '●●●●5521', breakdown: bd([]) },
  { id: 'PO-D-7007', name: 'Amit Halder', deliveryBoyId: 'DLV-303', amount: 2640, deliveriesIncluded: 38, status: 'paid', date: '2026-07-20', bankAccount: '●●●●1102', breakdown: bd([]) },
  { id: 'PO-D-7006', name: 'Kaushik Dey', deliveryBoyId: 'DLV-306', amount: 1180, deliveriesIncluded: 14, status: 'failed', date: '2026-07-19', bankAccount: '●●●●7758', breakdown: bd([]) },
];

export const NEXT_SCHEDULED_PAYOUT = '2026-08-03';

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

export const MOCK_BANNERS: Banner[] = [
  { id: 'BN-1', title: 'Monsoon offer — 20% off banners', linkUrl: '/stores?q=banners', active: true, color: 'from-blue-500 to-indigo-600' },
  { id: 'BN-2', title: 'Thesis season: free binding', linkUrl: '/stores?q=binding', active: true, color: 'from-emerald-500 to-teal-600' },
  { id: 'BN-3', title: 'Become a seller — zero setup fee', linkUrl: '/seller/register', active: true, color: 'from-violet-500 to-purple-600' },
  { id: 'BN-4', title: 'Diwali card printing', linkUrl: '/stores?q=cards', active: false, color: 'from-amber-500 to-orange-600' },
];

export interface ServiceCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  active: boolean;
  serviceCount: number;
}

export const MOCK_CATEGORIES: ServiceCategoryRow[] = [
  { id: 'CAT-1', name: 'Documents', slug: 'documents', icon: 'file', active: true, serviceCount: 5 },
  { id: 'CAT-2', name: 'Bulk printing', slug: 'bulk-printing', icon: 'package', active: true, serviceCount: 4 },
  { id: 'CAT-3', name: 'Business stationery', slug: 'business-stationery', icon: 'id', active: true, serviceCount: 5 },
  { id: 'CAT-4', name: 'Specialty printing', slug: 'specialty-printing', icon: 'image', active: true, serviceCount: 5 },
  { id: 'CAT-5', name: 'Packaging & labels', slug: 'packaging-labels', icon: 'tag', active: true, serviceCount: 4 },
  { id: 'CAT-6', name: 'Book binding & finishing', slug: 'binding-finishing', icon: 'badge', active: true, serviceCount: 5 },
  { id: 'CAT-7', name: 'Large format printing', slug: 'large-format', icon: 'flag', active: true, serviceCount: 5 },
  { id: 'CAT-8', name: 'Custom services', slug: 'custom-services', icon: 'settings', active: false, serviceCount: 0 },
];

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  active: boolean;
  color: string;
}

export const MOCK_TEMPLATES: TemplateRow[] = [
  { id: 'TPL-1', name: 'Minimal Business Card', category: 'Business stationery', usageCount: 428, active: true, color: 'bg-slate-300' },
  { id: 'TPL-2', name: 'Festive Sale Banner', category: 'Large format printing', usageCount: 212, active: true, color: 'bg-orange-300' },
  { id: 'TPL-3', name: 'Wedding Invite — Classic', category: 'Specialty printing', usageCount: 176, active: true, color: 'bg-rose-300' },
  { id: 'TPL-4', name: 'Thesis Cover Page', category: 'Documents', usageCount: 641, active: true, color: 'bg-blue-300' },
  { id: 'TPL-5', name: 'Product Label — Round', category: 'Packaging & labels', usageCount: 89, active: false, color: 'bg-emerald-300' },
];

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

export const MOCK_FAQS: FaqCategory[] = [
  {
    id: 'FQ-1',
    name: 'Ordering',
    items: [
      { id: 'q1', question: 'How do I place an order?', answer: 'Browse shops near you, pick a service, upload your file and choose delivery. You pay only after confirming the final cost.' },
      { id: 'q2', question: 'What file formats are supported?', answer: 'PDF, DOCX, JPG, PNG, AI, PSD and CDR up to 25 MB. PDF preserves formatting most reliably.' },
    ],
  },
  {
    id: 'FQ-2',
    name: 'Delivery',
    items: [
      { id: 'q3', question: 'How fast is same-day delivery?', answer: 'Order before 2 PM and most shops deliver the same evening within city limits.' },
      { id: 'q4', question: 'Can I collect from the shop?', answer: 'Yes — choose Store Pickup at checkout. Most orders are ready within two hours.' },
    ],
  },
  {
    id: 'FQ-3',
    name: 'Payments & refunds',
    items: [
      { id: 'q5', question: 'When am I charged?', answer: 'Payment is held securely when you place the order and released to the shop once it is confirmed.' },
      { id: 'q6', question: 'How long do refunds take?', answer: 'Refunds are issued instantly to your PrinZex wallet, or 5–7 working days back to your bank.' },
    ],
  },
];

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

export const MOCK_ADMIN_ACCOUNTS: AdminAccount[] = [
  { id: 'ADM-1', name: 'Aditi Verma', email: 'aditi.verma@prinzex.in', role: 'super_admin', lastLogin: '2026-07-27T10:40:00+05:30', active: true },
  { id: 'ADM-2', name: 'Rohan Iyer', email: 'rohan.iyer@prinzex.in', role: 'ops_manager', lastLogin: '2026-07-27T09:05:00+05:30', active: true },
  { id: 'ADM-3', name: 'Farah Khan', email: 'farah.khan@prinzex.in', role: 'support_agent', lastLogin: '2026-07-27T08:20:00+05:30', active: true },
  { id: 'ADM-4', name: 'Deepak Nair', email: 'deepak.nair@prinzex.in', role: 'finance_manager', lastLogin: '2026-07-26T17:55:00+05:30', active: true },
  { id: 'ADM-5', name: 'Sara Mathew', email: 'sara.mathew@prinzex.in', role: 'content_manager', lastLogin: '2026-07-25T12:10:00+05:30', active: true },
  { id: 'ADM-6', name: 'Nikhil Rao', email: 'nikhil.rao@prinzex.in', role: 'support_agent', lastLogin: '2026-06-30T11:00:00+05:30', active: false },
];

export interface CommissionRow {
  categoryId: string;
  category: string;
  rate: number;
}

export const MOCK_COMMISSIONS: CommissionRow[] = MOCK_CATEGORIES.map((c, i) => ({
  categoryId: c.id,
  category: c.name,
  rate: [12, 10, 12, 14, 12, 11, 13, 12][i] ?? 12,
}));

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: AdminRole;
  action: string;
  entity: string;
  ip: string;
}

export const MOCK_ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: 'L-1', timestamp: '2026-07-27T10:42:00+05:30', adminName: 'Aditi Verma', adminRole: 'super_admin', action: 'Approved seller application', entity: 'Colorcraft Studio', ip: '103.48.12.77' },
  { id: 'L-2', timestamp: '2026-07-27T10:15:00+05:30', adminName: 'Rohan Iyer', adminRole: 'ops_manager', action: 'Reassigned delivery partner', entity: 'ORD-4402', ip: '49.37.201.14' },
  { id: 'L-3', timestamp: '2026-07-27T09:50:00+05:30', adminName: 'Deepak Nair', adminRole: 'finance_manager', action: 'Approved payout batch', entity: 'PO-S-5008', ip: '182.72.44.9' },
  { id: 'L-4', timestamp: '2026-07-27T09:12:00+05:30', adminName: 'Farah Khan', adminRole: 'support_agent', action: 'Opened support ticket', entity: 'T-441', ip: '117.203.9.221' },
  { id: 'L-5', timestamp: '2026-07-27T08:30:00+05:30', adminName: 'Sara Mathew', adminRole: 'content_manager', action: 'Published homepage banner', entity: 'BN-2', ip: '106.51.77.140' },
  { id: 'L-6', timestamp: '2026-07-26T18:20:00+05:30', adminName: 'Aditi Verma', adminRole: 'super_admin', action: 'Suspended seller', entity: 'Campus Print Point', ip: '103.48.12.77' },
  { id: 'L-7', timestamp: '2026-07-26T17:00:00+05:30', adminName: 'Rohan Iyer', adminRole: 'ops_manager', action: 'Blocked user account', entity: 'USR-1006', ip: '49.37.201.14' },
  { id: 'L-8', timestamp: '2026-07-26T15:35:00+05:30', adminName: 'Deepak Nair', adminRole: 'finance_manager', action: 'Marked payout as paid', entity: 'PO-S-5006', ip: '182.72.44.9' },
  { id: 'L-9', timestamp: '2026-07-26T14:10:00+05:30', adminName: 'Farah Khan', adminRole: 'support_agent', action: 'Resolved ticket', entity: 'T-430', ip: '117.203.9.221' },
  { id: 'L-10', timestamp: '2026-07-26T11:05:00+05:30', adminName: 'Sara Mathew', adminRole: 'content_manager', action: 'Deactivated template', entity: 'TPL-5', ip: '106.51.77.140' },
  { id: 'L-11', timestamp: '2026-07-25T16:45:00+05:30', adminName: 'Aditi Verma', adminRole: 'super_admin', action: 'Updated commission rate', entity: 'Specialty printing → 14%', ip: '103.48.12.77' },
  { id: 'L-12', timestamp: '2026-07-25T13:20:00+05:30', adminName: 'Rohan Iyer', adminRole: 'ops_manager', action: 'Verified delivery partner', entity: 'DLV-308', ip: '49.37.201.14' },
  { id: 'L-13', timestamp: '2026-07-25T10:00:00+05:30', adminName: 'Aditi Verma', adminRole: 'super_admin', action: 'Invited new admin', entity: 'nikhil.rao@prinzex.in', ip: '103.48.12.77' },
  { id: 'L-14', timestamp: '2026-07-24T19:30:00+05:30', adminName: 'Deepak Nair', adminRole: 'finance_manager', action: 'Issued refund', entity: 'ORD-4381 · ₹720', ip: '182.72.44.9' },
  { id: 'L-15', timestamp: '2026-07-24T15:10:00+05:30', adminName: 'Rohan Iyer', adminRole: 'ops_manager', action: 'Credited wallet manually', entity: 'USR-1010 · ₹500', ip: '49.37.201.14' },
];
