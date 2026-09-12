import { post } from './client';

export interface PaymentOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
}

/** Create a Razorpay order for an existing PrinZex order. */
export const createPaymentOrder = async (orderId: string): Promise<PaymentOrderResponse> => post<PaymentOrderResponse>('/payments/create-order', { orderId });

/** Verify a Razorpay payment. */
export const verifyPayment = async (data: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<any> => post('/payments/verify', data);
