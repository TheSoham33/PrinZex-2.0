import type { Request } from 'express';
import { logger } from '../config/logger';
import { ActivityLogModel } from '../models/mongo/ActivityLog.model';
import { ApiError } from './ApiError';
import type { AdminTokenPayload } from './jwt';

/**
 * Central admin audit writer (MongoDB ActivityLog).
 *
 * FIRE-AND-FORGET: call WITHOUT await from controllers — a slow/unavailable
 * Mongo must never block an admin action's response. Failures are caught and
 * logged internally, so the returned promise never rejects.
 *
 * Fields mirror the IActivityLog schema; `action` is dot-notation
 * ("seller.approved", "user.suspended", `ticket.resolved", ...).
 */
export interface LogActivityParams {
  adminId: string;
  adminName: string;
  adminRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  req: Request; // for IP + userAgent
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const userAgent = params.req.headers['user-agent'];
    await ActivityLogModel.create({
      adminId: params.adminId,
      adminName: params.adminName,
      adminRole: params.adminRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      ...(params.metadata ? { metadata: params.metadata } : {}),
      ...(params.req.ip ? { ipAddress: params.req.ip } : {}),
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
    });
  } catch (error) {
    logger.error('activity_log_write_failed', {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Identity of the acting admin, pulled from the JWT. The access token carries
 * the admin's display name (step-8 claim) precisely so this fire-and-forget
 * path needs no Admin-table lookup per action.
 */
export function adminIdentity(req: Request): { adminId: string; adminName: string; adminRole: string } {
  const user = req.user as AdminTokenPayload | undefined;
  if (!user || user.role !== 'ADMIN') {
    throw ApiError.unauthorized();
  }
  return { adminId: user.adminId, adminName: user.name ?? '', adminRole: user.adminRole };
}
