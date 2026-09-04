import { get, getList, post } from './client';

export interface WalletTransaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reason: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

/** A wallet ledger entry as returned by /customer/wallet/transactions. */
export interface Transaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  reason: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface WalletInfo {
  balance: number;
  loyaltyPoints: number;
  lastTransactions: WalletTransaction[];
}

/** Get wallet balance and recent transactions. */
export const fetchWalletInfo = async (): Promise<WalletInfo> => get<WalletInfo>('/customer/wallet');

/** Get just the wallet balance. */
export const fetchWalletBalance = async (): Promise<number> => {
  const data = await fetchWalletInfo();
  return data.balance;
};

/** Get the seller's pending balance for payouts. */
export const fetchPendingPayoutBalance = async (): Promise<any> => get('/seller/payouts/pending-balance');

/** Request an early payout. */
export const requestPayout = async (): Promise<any> => post('/seller/payouts/request');

/** Get all wallet transactions with pagination. */
export const fetchWalletTransactions = async (page = 1, limit = 10): Promise<Transaction[]> => getList('/customer/wallet/transactions', { page, limit });
