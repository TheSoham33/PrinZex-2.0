import { apiRequest } from './client';

export interface PaymentOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
}

/** Create a Razorpay order for an existing PrinZex order. */
export const createPaymentOrder = async (orderId: string): Promise<PaymentOrderResponse> => {
  return apiRequest<PaymentOrderResponse>('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
};

/** Verify a Razorpay payment. */
export const verifyPayment = async (data: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<any> => {
  return apiRequest<any>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
