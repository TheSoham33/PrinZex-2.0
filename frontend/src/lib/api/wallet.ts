import { apiRequest } from './client';

export interface WalletTransaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reason: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface WalletInfo {
  balance: number;
  loyaltyPoints: number;
  lastTransactions: WalletTransaction[];
}

/** Get wallet balance and recent transactions. */
export const fetchWalletInfo = async (): Promise<WalletInfo> => {
  return apiRequest<WalletInfo>('/customer/wallet');
};

/** Get just the wallet balance. */
export const fetchWalletBalance = async (): Promise<number> => {
  const data = await fetchWalletInfo();
  return data.balance;
};

/** Get all wallet transactions with pagination. */
export const fetchWalletTransactions = async (page = 1, limit = 10): Promise<any[]> => {
  const res = await apiRequest<any>('/customer/wallet/transactions', {
    params: { page, limit },
  });
  return res.data || res;
};

export const MOCK_COUPONS = [
  { code: 'WELCOME10', title: '10% OFF', description: 'Get 10% off on your first order up to ₹100.', expiresOn: '2026-12-31' },
  { code: 'FLAT50', title: '₹50 OFF', description: 'Flat ₹50 discount on orders above ₹299.', expiresOn: '2026-11-15' },
];

/** Add money to wallet (initiate). */
export const initiateTopup = async (amount: number): Promise<any> => {
  return apiRequest<any>('/wallet/topup/initiate', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

/** Verify wallet topup. */
export const verifyTopup = async (verificationData: any): Promise<any> => {
  return apiRequest<any>('/wallet/topup/verify', {
    method: 'POST',
    body: JSON.stringify(verificationData),
  });
};
