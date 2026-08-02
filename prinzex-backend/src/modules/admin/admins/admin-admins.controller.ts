import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminAdminsService from './admin-admins.service';
import type { InviteAdminBody, UpdateRoleBody } from './admin-admins.routes';

/** Admin account management (SUPER_ADMIN). logActivity fires without await. */

export const listAdmins = asyncHandler(async (_req, res) => {
  const admins = await adminAdminsService.listAdmins();
  res.status(200).json(new ApiResponse(200, admins, 'Admin accounts fetched'));
});

export const inviteAdmin = asyncHandler(async (req, res) => {
  const admin = await adminAdminsService.inviteAdmin(req.body as InviteAdminBody);
  void logActivity({
    ...adminIdentity(req),
    action: 'admin.invited',
    entityType: 'admin',
    entityId: admin.id,
    metadata: { email: admin.email, role: admin.role },
    req,
  });
  res.status(201).json(new ApiResponse(201, admin, `Invite sent to ${admin.email}`));
});

export const updateAdminRole = asyncHandler(async (req, res) => {
  const { role } = req.body as UpdateRoleBody;
  const result = await adminAdminsService.updateAdminRole(req.params.adminId, { role });
  void logActivity({
    ...adminIdentity(req),
    action: 'admin.role.changed',
    entityType: 'admin',
    entityId: req.params.adminId,
    metadata: { role },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Admin role updated — sessions revoked'));
});

export const deactivateAdmin = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const result = await adminAdminsService.deactivateAdmin(identity.adminId, req.params.adminId);
  void logActivity({
    ...identity,
    action: 'admin.deactivated',
    entityType: 'admin',
    entityId: req.params.adminId,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Admin deactivated — sessions revoked'));
});
