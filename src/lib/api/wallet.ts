import { fakeDelay } from '@/lib/utils';

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  description: string;
  amount: number;
  date: string;
}

export interface Coupon {
  code: string;
  title: string;
  description: string;
  expiresOn: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-1',
    type: 'debit',
    title: 'Order ORD-8812',
    description: 'B&W Xerox · Quick Copy Hub',
    amount: 120,
    date: '2026-07-27T08:05:00+05:30',
  },
  {
    id: 'txn-2',
    type: 'credit',
    title: 'Refund processed',
    description: 'Order ORD-0011 cancelled',
    amount: 20,
    date: '2026-06-22T20:10:00+05:30',
  },
  {
    id: 'txn-3',
    type: 'debit',
    title: 'Order ORD-1122',
    description: 'Vinyl Banners · Print Master Pro',
    amount: 300,
    date: '2026-07-18T12:40:00+05:30',
  },
  {
    id: 'txn-4',
    type: 'credit',
    title: 'Wallet top-up',
    description: 'Added via UPI',
    amount: 500,
    date: '2026-07-15T18:22:00+05:30',
  },
];

export const MOCK_COUPONS: Coupon[] = [
  {
    code: 'WELCOME10',
    title: '10% off your next order',
    description: 'Valid on orders above ₹200. Max discount ₹100.',
    expiresOn: '2026-09-30',
  },
  {
    code: 'FIRSTORDER',
    title: 'Flat ₹50 off',
    description: 'Applicable once on your first order from any new store.',
    expiresOn: '2026-12-31',
  },
];

export const fetchWalletBalance = async (): Promise<number> => {
  await fakeDelay();
  return 240;
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  await fakeDelay();
  return MOCK_TRANSACTIONS;
};
