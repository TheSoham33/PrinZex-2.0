import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { generateOtp, storeOtp, verifyOtp } from '../../utils/otp';
import { sendOtpSms } from '../../utils/email';
import { canonicalPhone } from '../../utils/phone';
import type { DeliveryTokenPayload } from '../../utils/jwt';
import {
  issueAndPersistTokens,
  rotateUserRefreshToken,
  type TokenPair,
} from '../auth/auth.helpers';

export interface DeliveryLoginInput {
  phone: string;
}

export interface DeliveryVerifyOtpInput {
  phone: string;
  otp: string;
}

export interface DeliverySession {
  deliveryBoy: {
    id: string;
    name: string;
    phone: string;
    status: string;
    isOnline: boolean;
  };
  tokens: TokenPair;
}

const LOGIN_OTP_PURPOSE = 'login_otp';

// ─── LOGIN (request OTP) ───────────────────────────────────────────────────
// Delivery boys authenticate with OTP only — no password is ever accepted.

export async function login(input: DeliveryLoginInput): Promise<{ sent: true; devOtp?: string }> {
  // Stored format is 10 digits (registration) — accept +91… too.
  const phone = canonicalPhone(input.phone);

  const boy = await prisma.deliveryBoy.findUnique({ where: { phone } });

  // Anti-enumeration: identical response for unknown numbers.
  if (!boy) {
    return { sent: true };
  }

  switch (boy.status) {
    case 'PENDING':
      throw ApiError.forbidden("Your application is under review — we'll notify you once approved");
    case 'SUSPENDED':
      throw ApiError.forbidden('Your delivery account has been suspended — contact support');
    case 'INACTIVE':
      throw ApiError.forbidden('Your delivery account is inactive — contact support');
    default:
      break;
  }

  const otp = generateOtp();
  await storeOtp(phone, LOGIN_OTP_PURPOSE, otp);
  await sendOtpSms(phone, otp, LOGIN_OTP_PURPOSE);

  // SMS is a stub in this phase: expose the OTP in non-production so the
  // flow stays testable end-to-end without a gateway.
  return env.isProduction ? { sent: true } : { sent: true, devOtp: otp };
}

// ─── VERIFY OTP (issue tokens) ─────────────────────────────────────────────

export async function verifyOtpLogin(input: DeliveryVerifyOtpInput): Promise<DeliverySession> {
  const { otp } = input;
  const phone = canonicalPhone(input.phone);

  const ok = await verifyOtp(phone, LOGIN_OTP_PURPOSE, otp);
  if (!ok) {
    throw ApiError.unauthorized('Invalid or expired OTP');
  }

  const boy = await prisma.deliveryBoy.findUnique({ where: { phone } });
  if (!boy || boy.status !== 'ACTIVE') {
    throw ApiError.unauthorized('Delivery account is not active');
  }

  const payload: DeliveryTokenPayload = {
    deliveryBoyId: boy.id,
    userId: boy.userId,
    role: 'DELIVERY_BOY',
  };
  const tokens = await issueAndPersistTokens(boy.userId, payload);

  return {
    deliveryBoy: {
      id: boy.id,
      name: boy.name,
      phone: boy.phone,
      status: boy.status,
      isOnline: boy.isOnline,
    },
    tokens,
  };
}

// ─── LOGOUT / REFRESH (same rotation pattern) ──────────────────────────────

export async function logout(refreshToken?: string): Promise<void> {
  // Revoke by token value alone — the refresh token IS the credential, so
  // knowing it authorizes its own revocation (the access token is short-lived
  // and the client doesn't send it here, so there's nothing to blacklist).
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}

export async function refresh(presentedToken: string): Promise<{ tokens: TokenPair }> {
  const tokens = await rotateUserRefreshToken(presentedToken, 'DELIVERY_BOY', (payload) => payload);
  return { tokens };
}
