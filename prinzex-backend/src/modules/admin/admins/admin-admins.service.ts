import crypto from 'crypto';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { ApiError } from '../../../utils/ApiError';
import { sendAdminInviteEmail } from '../../../utils/email';
import { hashPassword } from '../../../utils/hash';
import type { InviteAdminBody, UpdateRoleBody } from './admin-admins.routes';

/**
 * Admin account lifecycle — invite (random temp password + email stub),
 * role change (forces re-login), deactivate. SUPER_ADMIN-only module.
 * `passwordHash` never leaves this service.
 */

/** 12-char URL-safe temporary password from CSPRNG bytes. */
export function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export interface AdminAccountDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// ── GET /api/admin/admins ──────────────────────────────────────────────────

export async function listAdmins(): Promise<AdminAccountDto[]> {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  return admins;
}

// ── POST /api/admin/admins (invite) ────────────────────────────────────────

export async function inviteAdmin(input: InviteAdminBody): Promise<AdminAccountDto> {
  const existing = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('An admin with this email already exists');
  }

  const tempPassword = generateTempPassword(12);
  const passwordHash = await hashPassword(tempPassword);
  const admin = await prisma.admin.create({
    data: { name: input.name, email: input.email, passwordHash, role: input.role },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  try {
    await sendAdminInviteEmail(admin.email, admin.name, tempPassword, admin.role);
  } catch (error) {
    // The account exists — a failed stub must not mask that.
    logger.error('admin_invite_email_failed', { adminId: admin.id, error: error instanceof Error ? error.message : String(error) });
  }

  return admin;
}

// ── PATCH /:adminId/role + /deactivate ─────────────────────────────────────

export async function updateAdminRole(adminId: string, input: UpdateRoleBody): Promise<{ adminId: string; role: string }> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }
  if (admin.role === input.role) {
    throw ApiError.conflict(`This admin already has role ${input.role}`);
  }
  if (admin.role === 'SUPER_ADMIN' && input.role !== 'SUPER_ADMIN') {
    await assertNotLastSuperAdmin(admin.id);
  }

  await prisma.$transaction([
    prisma.admin.update({ where: { id: admin.id }, data: { role: input.role } }),
    // Force re-login so fresh tokens carry the new role's permissions.
    prisma.adminRefreshToken.deleteMany({ where: { adminId: admin.id } }),
  ]);

  return { adminId: admin.id, role: input.role };
}

export async function deactivateAdmin(actingAdminId: string, adminId: string): Promise<{ adminId: string; isActive: boolean }> {
  if (actingAdminId === adminId) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }
  if (!admin.isActive) {
    throw ApiError.conflict('This admin account is already deactivated');
  }
  if (admin.role === 'SUPER_ADMIN') {
    await assertNotLastSuperAdmin(admin.id);
  }

  await prisma.$transaction([
    prisma.admin.update({ where: { id: admin.id }, data: { isActive: false } }),
    prisma.adminRefreshToken.deleteMany({ where: { adminId: admin.id } }),
  ]);

  return { adminId: admin.id, isActive: false };
}

/** Guard rail (extension): never leave the platform without a SUPER_ADMIN. */
async function assertNotLastSuperAdmin(excludeAdminId: string): Promise<void> {
  const others = await prisma.admin.count({
    where: { role: 'SUPER_ADMIN', isActive: true, id: { not: excludeAdminId } },
  });
  if (others === 0) {
    throw ApiError.badRequest('Cannot remove the last active SUPER_ADMIN account');
  }
}
