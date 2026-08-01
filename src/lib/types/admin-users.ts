/** Platform customer records for the admin Users page. */

export type AdminUserStatus = 'active' | 'blocked';

export interface UserOrderSummary {
  id: string;
  storeName: string;
  serviceName: string;
  total: number;
  status: string;
  placedAt: string;
}

export interface UserTransaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
}

export interface UserAddress {
  id: string;
  label: string;
  fullAddress: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  ordersPlaced: number;
  walletBalance: number;
  status: AdminUserStatus;
  lastLogin: string;
  lastDevice: string;
  lastIp: string;
  addresses: UserAddress[];
  recentOrders: UserOrderSummary[];
  recentTransactions: UserTransaction[];
}



