import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

/**
 * Razorpay SDK singleton. LIVE wiring (not a stub) — but the SDK constructor
 * throws when key_id is empty, so with blank dev credentials we hold `null`
 * instead of crashing boot (same policy as the AWS/SMTP empty-string stubs).
 * Every gateway call site goes through {@link razorpayClient} AFTER
 * assertGatewayConfigured(), so a null client is never dereferenced.
 */
export const razorpay: Razorpay | null = razorpayConfigured()
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

export function razorpayConfigured(): boolean {
  return env.RAZORPAY_KEY_ID.length > 0 && env.RAZORPAY_KEY_SECRET.length > 0;
}

/** The only way to reach the SDK — fails loudly when unconfigured. */
export function razorpayClient(): Razorpay {
  if (!razorpay) {
    throw ApiError.internal('Payment gateway is not configured (missing RAZORPAY_KEY_ID/SECRET)');
  }
  return razorpay;
}

/**
 * Checkout verification: HMAC-SHA256 over
 * `${razorpayOrderId}|${razorpayPaymentId}` with the key secret.
 * Plain function so it is unit-testable without the SDK.
 */
export function computeCheckoutSignature(razorpayOrderId: string, razorpayPaymentId: string): string {
  return crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

/**
 * Webhook verification: HMAC-SHA256 over the RAW request body with the
 * webhook secret. Constant-time comparison to avoid timing oracle.
 */
export function isValidWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (env.RAZORPAY_WEBHOOK_SECRET.length === 0) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
