import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminSupportController from './admin-support.controller';

/**
 * Support ticket management — mounted at /api/admin/support.
 * Spec's "Require canManageOrders" → the platform's support vocabulary:
 * reads support.view (OPS_MANAGER also has it), mutations support.manage
 * (SUPER_ADMIN + SUPPORT_AGENT).
 */

export const ticketsQuery = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  category: z.enum(['DELIVERY_ISSUE', 'QUALITY_ISSUE', 'PAYMENT_ISSUE', 'CANCELLATION', 'OTHER']).optional(),
  assignedTo: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ticketParams = z.object({ ticketId: z.string().min(1) });

export const replyBody = z.object({ content: z.string().trim().min(1).max(2000) });

export const assignBody = z.object({ adminId: z.string().min(1) });

export const priorityBody = z.object({ priority: z.enum(['LOW', 'MEDIUM', 'HIGH']) });

export const resolveBody = z.object({ note: z.string().trim().min(1).max(2000).optional() });

export type TicketsQuery = z.infer<typeof ticketsQuery>;
export type ReplyBody = z.infer<typeof replyBody>;
export type AssignBody = z.infer<typeof assignBody>;
export type PriorityBody = z.infer<typeof priorityBody>;
export type ResolveBody = z.infer<typeof resolveBody>;

export const adminSupportRouter = Router();

adminSupportRouter.get('/tickets', requirePermission('support.view'), validate({ query: ticketsQuery }), adminSupportController.listTickets);
adminSupportRouter.get('/stats', requirePermission('support.view'), adminSupportController.getSupportStats);
adminSupportRouter.get('/tickets/:ticketId', requirePermission('support.view'), validate({ params: ticketParams }), adminSupportController.getTicketDetail);
adminSupportRouter.post('/tickets/:ticketId/reply', requirePermission('support.manage'), validate({ params: ticketParams, body: replyBody }), adminSupportController.replyToTicket);
adminSupportRouter.patch('/tickets/:ticketId/assign', requirePermission('support.manage'), validate({ params: ticketParams, body: assignBody }), adminSupportController.assignTicket);
adminSupportRouter.patch('/tickets/:ticketId/priority', requirePermission('support.manage'), validate({ params: ticketParams, body: priorityBody }), adminSupportController.updatePriority);
adminSupportRouter.post('/tickets/:ticketId/resolve', requirePermission('support.manage'), validate({ params: ticketParams, body: resolveBody }), adminSupportController.resolveTicket);
adminSupportRouter.post('/tickets/:ticketId/close', requirePermission('support.manage'), validate({ params: ticketParams }), adminSupportController.closeTicket);
