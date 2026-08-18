/** Payout domain types. */

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
