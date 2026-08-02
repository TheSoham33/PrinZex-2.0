import { randomInt } from 'crypto';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis';

/**
 * One-time-password helpers backed by Redis.
 *
 * Keys: otp:{identifier}:{purpose} (see REDIS_KEYS), TTL = REDIS_TTL.OTP.
 * Purposes used in this codebase: "email_verify" | "phone_verify" |
 * "password_reset" | "login_otp".
 */

/** 6-digit cryptographically-random numeric OTP. */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/** Persist an OTP for an identifier + purpose with the standard TTL. */
export async function storeOtp(identifier: string, purpose: string, code: string): Promise<void> {
  await redis.set(REDIS_KEYS.OTP(identifier, purpose), code, 'EX', REDIS_TTL.OTP);
}

/**
 * Check an OTP. On a successful match the key is deleted immediately so a
 * code can never be replayed.
 */
export async function verifyOtp(identifier: string, purpose: string, code: string): Promise<boolean> {
  const key = REDIS_KEYS.OTP(identifier, purpose);
  const stored = await redis.get(key);
  if (!stored || stored !== code) {
    return false;
  }
  await redis.del(key);
  return true;
}

/** Pick the verification purpose that matches the identifier type. */
export function purposeForIdentifier(identifier: string): 'email_verify' | 'phone_verify' {
  return identifier.includes('@') ? 'email_verify' : 'phone_verify';
}
