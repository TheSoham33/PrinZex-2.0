import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { REDIS_KEYS } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { comparePassword } from '../../utils/hash';
import {
  issueTokenPair,
  verifyRefreshToken,
  type AdminTokenPayload,
  type TokenPayload,
} from '../../utils/jwt';
import {
  assertNotLockedOut,
  bumpLoginAttempts,
  clearLoginAttempts,
  blacklistAccessToken,
  durationToMs,
  type TokenPair,
} from '../auth/auth.helpers';

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminSession {
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt: Date | null;
  };
  tokens: TokenPair;
}

// ─── PERMISSIONS ───────────────────────────────────────────────────────────

/** Every permission key that exists on the platform. */
export const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.manage',
  'sellers.view',
  'sellers.manage',
  'sellers.verify',
  'delivery.view',
  'delivery.manage',
  'delivery.verify',
  'orders.view',
  'orders.manage',
  'payouts.view',
  'payouts.manage',
  'coupons.view',
  'coupons.manage',
  'content.view',
  'content.manage',
  'catalog.view',
  'catalog.manage',
  'support.view',
  'support.manage',
  'analytics.view',
  'admins.view',
  'admins.manage',
  'logs.view',
  'settings.manage',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** Role → granted permissions map. SUPER_ADMIN gets everything. */
const ROLE_PERMISSIONS: Record<string, readonly AdminPermission[]> = {
  SUPER_ADMIN: ADMIN_PERMISSIONS,
  OPS_MANAGER: [
    'dashboard.view',
    'sellers.view',
    'sellers.manage',
    'sellers.verify',
    'delivery.view',
    'delivery.manage',
    'delivery.verify',
    'orders.view',
    'orders.manage',
    'support.view',
  ],
  SUPPORT_AGENT: ['dashboard.view', 'users.view', 'orders.view', 'support.view', 'support.manage'],
  FINANCE_MANAGER: ['dashboard.view', 'users.view', 'orders.view', 'payouts.view', 'payouts.manage', 'analytics.view'],
  CONTENT_MANAGER: ['dashboard.view', 'content.view', 'content.manage', 'catalog.view', 'catalog.manage', 'coupons.view', 'coupons.manage'],
};

/** Build the granular boolean map + frontend compatibility flags. */
export function buildPermissions(adminRole: string): Record<string, boolean> {
  const granted = new Set<string>(ROLE_PERMISSIONS[adminRole] ?? []);
  const map = Object.fromEntries(ADMIN_PERMISSIONS.map((p) => [p, granted.has(p)]));

  // Frontend compatibility flags (mapped from granular ones)
  return {
    ...map,
    canManageUsers: map['users.view'] || map['users.manage'],
    canManageSellers: map['sellers.view'] || map['sellers.manage'],
    canManageOrders: map['orders.view'] || map['orders.manage'] || map['support.view'],
    canManagePayouts: map['payouts.view'] || map['payouts.manage'],
    canManageContent: map['content.view'] || map['content.manage'],
    canManageCatalog: map['catalog.view'] || map['catalog.manage'],
    canManageAdmins: map['admins.view'] || map['admins.manage'],
  };
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────

export async function login(input: AdminLoginInput): Promise<AdminSession & { admin: { permissions: Record<string, boolean> } }> {
  const { email, password } = input;
  const attemptsKey = REDIS_KEYS.LOGIN_ATTEMPTS(`admin:${email}`);

  await assertNotLockedOut(attemptsKey);

  let admin = await prisma.admin.findUnique({ where: { email } });

  // For development: auto-seed the admin if it's the default one and doesn't exist
  if (!admin && email === 'admin@prinzex.com' && password === 'Admin@123') {
    const { hashPassword } = await import('../../utils/hash');
    admin = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@prinzex.com',
        passwordHash: await hashPassword('Admin@123'),
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
  }

  const passwordOk = admin ? await comparePassword(password, admin.passwordHash) : false;
  if (!admin || !passwordOk) {
    await bumpLoginAttempts(attemptsKey);
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('This admin account has been deactivated');
  }

  await clearLoginAttempts(attemptsKey);

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const permissions = buildPermissions(admin.role);

  const payload: AdminTokenPayload = {
    adminId: admin.id,
    role: 'ADMIN',
    adminRole: admin.role,
    name: admin.name,
    permissions,
  };
  const tokens = await issueAndPersistAdminTokens(admin.id, payload);

  return {
    admin: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      lastLoginAt: updated.lastLoginAt,
      permissions, // Include permissions here for the frontend!
    },
    tokens,
  };
}

// ─── LOGOUT / REFRESH (AdminRefreshToken table) ────────────────────────────

export async function logout(
  adminId: string,
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  await blacklistAccessToken(accessToken);
  if (refreshToken) {
    // AdminRefreshToken has no revoked flag — delete the row outright.
    await prisma.adminRefreshToken.deleteMany({ where: { token: refreshToken, adminId } });
  }
}

export async function refresh(
  presentedToken: string,
): Promise<{ tokens: TokenPair; admin: { permissions: Record<string, boolean> } }> {
  const payload = verifyRefreshToken(presentedToken);
  if (payload.role !== 'ADMIN' || !('adminId' in payload)) {
    throw ApiError.unauthorized('Invalid token type for this endpoint');
  }

  const stored = await prisma.adminRefreshToken.findUnique({ where: { token: presentedToken } });
  if (!stored || stored.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized('Refresh token is no longer valid, please log in again');
  }
  if (stored.adminId !== payload.adminId) {
    throw ApiError.unauthorized('Refresh token does not match its owner');
  }

  // Enforce that the account is still active before rotating.
  const admin = await prisma.admin.findUnique({ where: { id: stored.adminId } });
  if (!admin || !admin.isActive) {
    throw ApiError.unauthorized('This admin account has been deactivated');
  }

  await prisma.adminRefreshToken.delete({ where: { id: stored.id } });

  const permissions = buildPermissions(admin.role);
  const fresh: AdminTokenPayload = {
    adminId: admin.id,
    role: 'ADMIN',
    adminRole: admin.role,
    name: admin.name,
    permissions,
  };
  const tokens = await issueAndPersistAdminTokens(admin.id, fresh);
  return { tokens, admin: { permissions } };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueAndPersistAdminTokens(
  adminId: string,
  payload: TokenPayload,
): Promise<TokenPair> {
  const pair = issueTokenPair(payload);
  await prisma.adminRefreshToken.create({
    data: {
      adminId,
      token: pair.refreshToken,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });
  return pair;
}
