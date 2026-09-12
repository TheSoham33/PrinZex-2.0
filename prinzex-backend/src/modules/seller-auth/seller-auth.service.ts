import { prisma } from '../../config/database';
import { REDIS_KEYS } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { comparePassword } from '../../utils/hash';
import type { SellerTokenPayload } from '../../utils/jwt';
import {
  assertNotLockedOut,
  bumpLoginAttempts,
  clearLoginAttempts,
  blacklistAccessToken,
  issueAndPersistTokens,
  rotateUserRefreshToken,
  revokeUserRefreshToken,
  type TokenPair,
} from '../auth/auth.helpers';
import type { SellerLoginInput, SellerLogoutInput, SellerRefreshInput } from './seller-auth.schema';

export interface SellerSession {
  seller: {
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    status: string;
    isVerified: boolean;
  };
  tokens: TokenPair;
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────

export async function login(input: SellerLoginInput): Promise<SellerSession> {
  const { email, password } = input;
  const attemptsKey = REDIS_KEYS.LOGIN_ATTEMPTS(`seller:${email}`);

  await assertNotLockedOut(attemptsKey);

  // Seller.userId is a plain string column (no Prisma relation), so the
  // linked User account (which holds the password hash) is loaded separately.
  const seller = await prisma.seller.findUnique({ where: { email } });
  const sellerUser = seller
    ? await prisma.user.findUnique({ where: { id: seller.userId } })
    : null;

  const passwordOk =
    sellerUser?.passwordHash != null
      ? await comparePassword(password, sellerUser.passwordHash)
      : false;
  if (!seller || !sellerUser || !passwordOk) {
    await bumpLoginAttempts(attemptsKey);
    throw ApiError.unauthorized('Invalid credentials');
  }

  // Status gates run AFTER password verification to avoid account probing.
  switch (seller.status) {
    case 'PENDING':
      throw ApiError.forbidden(
        "Your store is under review — we'll notify you once it's approved",
      );
    case 'REJECTED':
      throw ApiError.forbidden(
        seller.rejectionReason
          ? `Your store application was rejected: ${seller.rejectionReason}`
          : 'Your store application was rejected',
      );
    case 'SUSPENDED':
      throw ApiError.forbidden('Your store has been suspended — contact support');
    default:
      break;
  }

  await clearLoginAttempts(attemptsKey);

  const payload: SellerTokenPayload = {
    sellerId: seller.id,
    userId: seller.userId,
    role: 'SELLER',
    status: seller.status,
  };
  const tokens = await issueAndPersistTokens(seller.userId, payload);

  return {
    seller: {
      id: seller.id,
      storeName: seller.storeName,
      ownerName: seller.ownerName,
      email: seller.email,
      status: seller.status,
      isVerified: seller.isVerified,
    },
    tokens,
  };
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────

export async function logout(userId: string, accessToken: string, input: SellerLogoutInput): Promise<void> {
  await blacklistAccessToken(accessToken);
  if (input.refreshToken) {
    await revokeUserRefreshToken(userId, input.refreshToken);
  }
}

// ─── REFRESH (rotation) ────────────────────────────────────────────────────

export async function refresh(input: SellerRefreshInput): Promise<{ tokens: TokenPair }> {
  const tokens = await rotateUserRefreshToken(input.refreshToken, 'SELLER', (payload) => payload);
  return { tokens };
}
