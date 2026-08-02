import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { NotificationModel } from '../../../models/mongo/Notification.model';
import { ApiError } from '../../../utils/ApiError';
import { roundMoney } from '../../../utils/financial';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../../utils/pagination';
import type { TicketsQuery } from './admin-support.routes';

/**
 * Support desk — ticket triage, replies, assignment and resolution.
 * status OPEN → IN_PROGRESS flips automatically on the first admin reply
 * (single conditional updateMany inside the same transaction as the message).
 */

async function notifyCustomer(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({ recipientId: userId, recipientType: 'customer', type, title, body, data, channel: ['push'] });
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = day === 0 ? 6 : day - 1; // back to Monday
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}

// ── GET /api/admin/support/tickets ─────────────────────────────────────────

export async function listTickets(query: TicketsQuery): Promise<PaginatedResponse<unknown>> {
  const where: Prisma.SupportTicketWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.category) where.category = query.category;
  if (query.assignedTo) where.assignedTo = query.assignedTo;
  if (query.search) where.subject = { contains: query.search, mode: 'insensitive' };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const total = await prisma.supportTicket.count({ where });
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    skip,
    take,
    select: {
      id: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      assignedTo: true,
      orderId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  return buildPaginatedResponse(
    tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo,
      orderId: ticket.orderId,
      customer: { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email },
      messagesCount: ticket._count.messages,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ── GET /api/admin/support/tickets/:ticketId ───────────────────────────────

export async function getTicketDetail(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      user: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
    },
  });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  const order = ticket.orderId
    ? await prisma.order.findUnique({
        where: { id: ticket.orderId },
        select: {
          id: true,
          status: true,
          total: true,
          paymentStatus: true,
          createdAt: true,
          seller: { select: { storeName: true } },
        },
      })
    : null;

  let assignee: { id: string; name: string } | null = null;
  if (ticket.assignedTo) {
    const admin = await prisma.admin.findUnique({ where: { id: ticket.assignedTo }, select: { id: true, name: true } });
    assignee = admin ? { id: admin.id, name: admin.name } : null;
  }

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    assignee,
    resolvedAt: ticket.resolvedAt,
    createdAt: ticket.createdAt,
    customer: ticket.user,
    order: order ? { ...order, total: Number(order.total) } : null,
    messages: ticket.messages,
  };
}

// ── POST /tickets/:ticketId/reply ──────────────────────────────────────────

export async function replyToTicket(
  adminId: string,
  ticketId: string,
  content: string,
): Promise<{ messageId: string; status: string }> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  if (ticket.status === 'CLOSED') {
    throw ApiError.badRequest('This ticket is closed — reopen it before replying');
  }

  const [message] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, senderType: 'admin', senderId: adminId, content },
    }),
    // Spec: an admin reply moves OPEN → IN_PROGRESS automatically (and only
    // that transition — RESOLVED tickets are not dragged backwards).
    prisma.supportTicket.updateMany({
      where: { id: ticket.id, status: 'OPEN' },
      data: { status: 'IN_PROGRESS' },
    }),
  ]);

  const status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;
  try {
    await notifyCustomer(
      ticket.userId,
      'support_reply',
      'New reply on your support ticket',
      `Our team replied to "${ticket.subject}".`,
      { ticketId: ticket.id },
    );
  } catch {
    // best-effort
  }

  return { messageId: message.id, status };
}

// ── PATCH /tickets/:ticketId/assign + /priority ────────────────────────────

export async function assignTicket(ticketId: string, adminId: string): Promise<{ ticketId: string; assignedTo: string; assigneeName: string }> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true, name: true, isActive: true } });
  if (!admin || !admin.isActive) {
    throw ApiError.badRequest('Cannot assign — admin not found or deactivated');
  }

  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { assignedTo: admin.id } });
  return { ticketId: ticket.id, assignedTo: admin.id, assigneeName: admin.name };
}

export async function updateTicketPriority(ticketId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH'): Promise<{ ticketId: string; priority: string }> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { priority } });
  return { ticketId: ticket.id, priority };
}

// ── POST /tickets/:ticketId/resolve + /close ───────────────────────────────

export async function resolveTicket(adminId: string, ticketId: string, note?: string): Promise<{ ticketId: string; status: string; resolvedAt: Date }> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  if (ticket.status === 'RESOLVED') {
    throw ApiError.conflict('This ticket is already resolved');
  }
  if (ticket.status === 'CLOSED') {
    throw ApiError.conflict('This ticket is closed');
  }

  const resolvedAt = new Date();
  await prisma.$transaction([
    // Final admin message when a resolution note is provided.
    ...(note
      ? [prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderType: 'admin', senderId: adminId, content: note } })]
      : []),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'RESOLVED', resolvedAt },
    }),
  ]);

  try {
    await notifyCustomer(
      ticket.userId,
      'support_resolved',
      'Your support ticket was resolved',
      `"${ticket.subject}" has been resolved${note ? `: ${note}` : '.'}`,
      { ticketId: ticket.id },
    );
  } catch {
    // best-effort
  }

  return { ticketId: ticket.id, status: 'RESOLVED', resolvedAt };
}

export async function closeTicket(ticketId: string): Promise<{ ticketId: string; status: string }> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  if (ticket.status === 'CLOSED') {
    throw ApiError.conflict('This ticket is already closed');
  }
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'CLOSED' } });
  return { ticketId: ticket.id, status: 'CLOSED' };
}

// ── GET /api/admin/support/stats ───────────────────────────────────────────

export interface SupportStats {
  openCount: number;
  inProgressCount: number;
  resolvedThisWeek: number;
  avgResponseTimeHours: number; // creation → first admin reply
  resolutionRate: number; // resolved / (resolved + closed + open)
}

export async function getSupportStats(): Promise<SupportStats> {
  const weekStart = startOfWeek();

  const [openCount, inProgressCount, resolvedThisWeek, resolvedTotal, closedTotal, avgRows] = await Promise.all([
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.supportTicket.count({ where: { status: 'RESOLVED', resolvedAt: { gte: weekStart } } }),
    prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
    prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    // Avg hours from ticket creation to the FIRST admin reply, per ticket,
    // averaged in Postgres (LATERAL picks each ticket's first admin message).
    prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (first_reply.first_at - t."createdAt")) / 3600.0)::float AS avg_hours
      FROM "SupportTicket" t
      JOIN LATERAL (
        SELECT MIN(m."createdAt") AS first_at
        FROM "TicketMessage" m
        WHERE m."ticketId" = t.id AND m."senderType" = 'admin'
      ) first_reply ON TRUE`,
  ]);

  const denominator = resolvedTotal + closedTotal + openCount; // spec formula
  return {
    openCount,
    inProgressCount,
    resolvedThisWeek,
    avgResponseTimeHours: roundMoney(Number(avgRows[0]?.avg_hours ?? 0)),
    resolutionRate: denominator === 0 ? 0 : roundMoney(resolvedTotal / denominator),
  };
}
