import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, requireSuperAdmin } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminAdminsController from './admin-admins.controller';

/**
 * Admin account management — mounted at /api/admin/admins.
 * Spec: "Require super_admin role ONLY" → requireSuperAdmin asserts the
 * JWT adminRole claim; requirePermission('admins.*') mirrors the
 * canManageAdmins gate (both keys exist only on SUPER_ADMIN in the
 * role → permissions map, so other admin roles get 403 either way).
 */

const adminRoleEnum = z.enum(['SUPER_ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT', 'FINANCE_MANAGER', 'CONTENT_MANAGER']);

export const inviteAdminBody = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  role: adminRoleEnum,
});

export const updateRoleBody = z.object({ role: adminRoleEnum });

export const adminParams = z.object({ adminId: z.string().min(1) });

export type InviteAdminBody = z.infer<typeof inviteAdminBody>;
export type UpdateRoleBody = z.infer<typeof updateRoleBody>;

export const adminAdminsRouter = Router();

adminAdminsRouter.use(requireSuperAdmin);

adminAdminsRouter.get('/', requirePermission('admins.view'), adminAdminsController.listAdmins);
adminAdminsRouter.post('/', requirePermission('admins.manage'), validate({ body: inviteAdminBody }), adminAdminsController.inviteAdmin);
adminAdminsRouter.patch(
  '/:adminId/role',
  requirePermission('admins.manage'),
  validate({ params: adminParams, body: updateRoleBody }),
  adminAdminsController.updateAdminRole,
);
adminAdminsRouter.patch('/:adminId/deactivate', requirePermission('admins.manage'), validate({ params: adminParams }), adminAdminsController.deactivateAdmin);
