import { randomInt } from 'crypto';
import type { User } from '@prisma/client';
import { prisma } from '../../config/database';
import { REDIS_KEYS } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateOtp, storeOtp, verifyOtp, purposeForIdentifier } from '../../utils/otp';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendOtpSms } from '../../utils/email';
import type { CustomerTokenPayload } from '../../utils/jwt';
import {
  assertNotLockedOut,
  bumpLoginAttempts,
  clearLoginAttempts,
  blacklistAccessToken,
  issueAndPersistTokens,
  rotateUserRefreshToken,
  revokeAllUserRefreshTokens,
  revokeUserRefreshToken,
  type TokenPair,
} from './auth.helpers';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schema';

/** User record stripped of every secret-bearing column. */
export type SafeUser = Omit<User, 'passwordHash' | 'twoFactorSecret'>;

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...safe } = user;
  return safe;
}

export interface AuthResult {
  user: SafeUser;
  tokens: TokenPair;
}

// ─── REGISTER ──────────────────────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { name, email, phone, password } = input;
  const identifier = email ?? phone;
  if (!identifier) {
    throw ApiError.unprocessable('Either email or phone is required');
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
  });
  if (existing) {
    throw ApiError.conflict(
      email && existing.email === email
        ? 'An account with this email already exists'
        : 'An account with this phone number already exists',
    );
  }

  const passwordHash = await hashPassword(password);
  const referralCode = await generateUniqueReferralCode(name);

  // User + Wallet must be created atomically.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email: email ?? null, phone: phone ?? null, passwordHash, role: 'CUSTOMER', referralCode },
    });
    await tx.wallet.create({ data: { userId: created.id, balance: 0, loyaltyPoints: 0 } });
    return created;
  });

  // Verification OTP for the primary identifier.
  await issueAndSendOtp(identifier, purposeForIdentifier(identifier), name);
  if (email) {
    await sendWelcomeEmail(email, name);
  }

  const payload: CustomerTokenPayload = { userId: user.id, role: 'CUSTOMER' };
  const tokens = await issueAndPersistTokens(user.id, payload);

  return { user: toSafeUser(user), tokens };
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<AuthResult> {
  const { identifier, password } = input;
  const normalized = identifier.includes('@') ? identifier.toLowerCase() : identifier;
  const attemptsKey = REDIS_KEYS.LOGIN_ATTEMPTS(normalized);

  await assertNotLockedOut(attemptsKey);

  const user = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', OR: [{ email: normalized }, { phone: normalized }] },
  });

  const passwordOk = user?.passwordHash ? await comparePassword(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    await bumpLoginAttempts(attemptsKey);
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated, please contact support');
  }

  const isEmailLogin = identifier.includes('@');
  const verified = isEmailLogin ? user.isEmailVerified : user.isPhoneVerified;
  if (!verified) {
    throw ApiError.forbidden(
      isEmailLogin
        ? 'Please verify your email before logging in'
        : 'Please verify your phone number before logging in',
    );
  }

  await clearLoginAttempts(attemptsKey);

  const payload: CustomerTokenPayload = { userId: user.id, role: 'CUSTOMER' };
  const tokens = await issueAndPersistTokens(user.id, payload);

  return { user: toSafeUser(user), tokens };
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────

export async function logout(userId: string, accessToken: string, input: LogoutInput): Promise<void> {
  await blacklistAccessToken(accessToken);
  if (input.refreshToken) {
    await revokeUserRefreshToken(userId, input.refreshToken);
  }
}

// ─── REFRESH (rotation) ────────────────────────────────────────────────────

export async function refresh(input: RefreshInput): Promise<{ tokens: TokenPair }> {
  const tokens = await rotateUserRefreshToken(input.refreshToken, 'CUSTOMER', (payload) => payload);
  return { tokens };
}

// ─── VERIFY EMAIL / PHONE ──────────────────────────────────────────────────

export async function verifyEmail(input: VerifyEmailInput): Promise<{ verified: true }> {
  const { identifier, otp } = input;
  const purpose = purposeForIdentifier(identifier);

  const ok = await verifyOtp(identifier, purpose, otp);
  if (!ok) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  const user = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) {
    throw ApiError.notFound('Account not found');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: purpose === 'email_verify' ? { isEmailVerified: true } : { isPhoneVerified: true },
  });

  return { verified: true };
}

// ─── RESEND OTP ────────────────────────────────────────────────────────────

export async function resendOtp(input: ResendOtpInput): Promise<{ sent: true }> {
  const { identifier, purpose } = input;

  const user = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', OR: [{ email: identifier }, { phone: identifier }] },
  });
  // Never reveal account existence; silently succeed for unknown identifiers.
  if (!user) {
    return { sent: true };
  }

  const alreadyVerified =
    purpose === 'email_verify' ? user.isEmailVerified : user.isPhoneVerified;
  if (alreadyVerified) {
    throw ApiError.badRequest('This identifier is already verified');
  }

  await issueAndSendOtp(identifier, purpose, user.name);
  return { sent: true };
}

// ─── FORGOT / RESET PASSWORD ───────────────────────────────────────────────

/** Always succeeds — no account enumeration. */
export async function forgotPassword(input: ForgotPasswordInput): Promise<{ sent: true }> {
  const { identifier } = input;

  const user = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (user) {
    const otp = generateOtp();
    await storeOtp(identifier, 'password_reset', otp);
    if (identifier.includes('@')) {
      await sendPasswordResetEmail(identifier, otp, user.name);
    } else {
      await sendOtpSms(identifier, otp, 'password_reset');
    }
  }

  return { sent: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ reset: true }> {
  const { identifier, otp, newPassword } = input;

  const ok = await verifyOtp(identifier, 'password_reset', otp);
  if (!ok) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  const user = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) {
    throw ApiError.notFound('Account not found');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Force re-login everywhere.
  await revokeAllUserRefreshTokens(user.id);

  return { reset: true };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueAndSendOtp(identifier: string, purpose: string, name?: string): Promise<void> {
  const otp = generateOtp();
  await storeOtp(identifier, purpose, otp);
  if (identifier.includes('@')) {
    await sendVerificationEmail(identifier, otp, name);
  } else {
    await sendOtpSms(identifier, otp, purpose);
  }
}

async function generateUniqueReferralCode(name: string): Promise<string> {
  const prefix = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'PRINZEX';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${prefix}${randomInt(1000, 10000)}`;
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) {
      return code;
    }
  }
  return `PZ${randomInt(100000, 1000000)}`;
}
