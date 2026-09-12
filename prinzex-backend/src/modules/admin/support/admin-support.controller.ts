import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminSupportService from './admin-support.service';
import type { AssignBody, PriorityBody, ReplyBody, ResolveBody, TicketsQuery } from './admin-support.routes';

/** Support desk. Mutations that spec lists logActivity for are logged — and
 * reply/priority/close are logged too (every mutating admin route is). */

export const listTickets = asyncHandler(async (req, res) => {
  const result = await adminSupportService.listTickets(req.query as unknown as TicketsQuery);
  res.status(200).json(new ApiResponse(200, result, 'Tickets fetched'));
});

export const getTicketDetail = asyncHandler(async (req, res) => {
  const detail = await adminSupportService.getTicketDetail(req.params.ticketId);
  res.status(200).json(new ApiResponse(200, detail, 'Ticket details fetched'));
});

export const replyToTicket = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const { content } = req.body as ReplyBody;
  const result = await adminSupportService.replyToTicket(identity.adminId, req.params.ticketId, content);
  void logActivity({
    ...identity,
    action: 'ticket.replied',
    entityType: 'support_ticket',
    entityId: req.params.ticketId,
    metadata: { status: result.status },
    req,
  });
  res.status(201).json(new ApiResponse(201, result, 'Reply added'));
});

export const assignTicket = asyncHandler(async (req, res) => {
  const { adminId } = req.body as AssignBody;
  const result = await adminSupportService.assignTicket(req.params.ticketId, adminId);
  void logActivity({
    ...adminIdentity(req),
    action: 'ticket.assigned',
    entityType: 'support_ticket',
    entityId: req.params.ticketId,
    metadata: { assignedTo: adminId, assigneeName: result.assigneeName },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, `Ticket assigned to ${result.assigneeName}`));
});

export const updatePriority = asyncHandler(async (req, res) => {
  const { priority } = req.body as PriorityBody;
  const result = await adminSupportService.updateTicketPriority(req.params.ticketId, priority);
  void logActivity({
    ...adminIdentity(req),
    action: 'ticket.priority.updated',
    entityType: 'support_ticket',
    entityId: req.params.ticketId,
    metadata: { priority },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Ticket priority updated'));
});

export const resolveTicket = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const { note } = req.body as ResolveBody;
  const result = await adminSupportService.resolveTicket(identity.adminId, req.params.ticketId, note);
  void logActivity({
    ...identity,
    action: 'ticket.resolved',
    entityType: 'support_ticket',
    entityId: req.params.ticketId,
    metadata: { ...(note ? { note } : {}) },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Ticket resolved'));
});

export const closeTicket = asyncHandler(async (req, res) => {
  const result = await adminSupportService.closeTicket(req.params.ticketId);
  void logActivity({
    ...adminIdentity(req),
    action: 'ticket.closed',
    entityType: 'support_ticket',
    entityId: req.params.ticketId,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Ticket closed'));
});

export const getSupportStats = asyncHandler(async (_req, res) => {
  const stats = await adminSupportService.getSupportStats();
  res.status(200).json(new ApiResponse(200, stats, 'Support stats fetched'));
});
