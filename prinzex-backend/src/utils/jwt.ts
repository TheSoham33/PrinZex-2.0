import jwt, { JsonWebTokenError, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * JWT utilities — one shared signing/verification layer for all four
 * actors. Each actor has its own payload shape; the `role` discriminator
 * field lets guards narrow safely.
 */

export interface CustomerTokenPayload {
  userId: string;
  role: 'CUSTOMER';
}

export interface SellerTokenPayload {
  sellerId: string;
  userId: string;
  role: 'SELLER';
  status: string;
}

export interface DeliveryTokenPayload {
  deliveryBoyId: string;
  userId: string;
  role: 'DELIVERY_BOY';
}

export interface AdminTokenPayload {
  adminId: string;
  role: 'ADMIN';
  adminRole: string;
  /** Display name — carried so fire-and-forget activity logging needs no DB lookup. */
  name?: string;
  permissions: Record<string, boolean>;
}

export type TokenPayload =
  | CustomerTokenPayload
  | SellerTokenPayload
  | DeliveryTokenPayload
  | AdminTokenPayload;

const accessOptions: SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
};

const refreshOptions: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
};

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return assertTokenPayload(jwt.verify(token, env.JWT_ACCESS_SECRET));
}

export function verifyRefreshToken(token: string): TokenPayload {
  return assertTokenPayload(jwt.verify(token, env.JWT_REFRESH_SECRET));
}

/** Convenience: sign both tokens for a payload at once. */
export function issueTokenPair(payload: TokenPayload): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Seconds until the given JWT expires (for Redis blacklist TTLs).
 * Falls back to the configured access-token lifetime when undecodable.
 */
export function secondsUntilTokenExpiry(token: string, fallbackSeconds: number): number {
  const decoded = jwt.decode(token);
  const exp =
    decoded && typeof decoded === 'object' && typeof decoded.exp === 'number'
      ? decoded.exp
      : null;
  if (!exp) return fallbackSeconds;
  const remaining = exp - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 1;
}

function assertTokenPayload(decoded: string | jwt.JwtPayload): TokenPayload {
  if (typeof decoded === 'string' || typeof decoded.role !== 'string') {
    throw new JsonWebTokenError('malformed token payload');
  }
  return decoded as TokenPayload;
}
