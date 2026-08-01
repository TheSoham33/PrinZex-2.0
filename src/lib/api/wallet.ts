import { api } from '@/lib/api-client';

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

export const fetchWalletBalance = async (): Promise<number> => {
  return api.get<number>('/api/wallet');
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  return api.get<Transaction[]>('/api/wallet/transactions');
};
