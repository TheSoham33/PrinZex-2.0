import { randomUUID } from 'crypto';
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
  // jwtid: every issued token is unique even for an identical payload in the
  // same second — RefreshToken.token has a UNIQUE constraint, and without a
  // jti two same-second sessions (or a login racing a refresh) collide with
  // P2002 on the persisted token value.
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { ...accessOptions, jwtid: randomUUID() });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { ...refreshOptions, jwtid: randomUUID() });
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
