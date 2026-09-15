import type { Complaint, ComplaintStatus } from '@prisma/client';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { OrderTimelineModel } from '../../models/mongo/Order.model';
import { ApiError } from '../../utils/ApiError';
import { enqueuePush } from '../../utils/fcm';
import { getComplaintResponseWindowHours } from '../../utils/platformSettings';
import { refundOrderToSource } from '../payments/payments.service';
import { appendTimelineEvent } from '../orders/orders.service';
import { emitAdminGlobalEvent, emitNotificationNew } from '../../realtime/realtime.emitters';
import {
  canAdminDecide,
  canCustomerEscalate,
  canSellerDecide,
  evidenceRequirements,
  isComplaintType,
  sellerRespondByFrom,
  validateEvidence,
  type ComplaintTypeValue,
} from './complaintPolicy';

/**
 * Dispute flow (customer → seller → admin):
 *  - the complaint is routed to the fulfilling seller AND admin on creation,
 *    but admin only observes until escalation;
 *  - the seller gets a response window (platform-configured hours): accept
 *    (instant refund via refundOrderToSource), reject (reason mandatory), or
 *    expire → auto-escalation;
 *  - the customer may escalate any seller decision they disagree with;
 *  - admin's decision (refund / close) is FINAL.
 */

export interface Actor {
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  userId: string;
  sellerId?: string;
}

export interface CreateComplaintInput {
  orderId: string;
  type: string;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
}

const COMPLAINT_INCLUDE = {
  order: {
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      createdAt: true,
      estimatedDelivery: true,
    },
  },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  seller: { select: { id: true, storeName: true } },
} as const;

async function notify(
  recipientId: string,
  recipientType: 'customer' | 'seller' | 'admin',
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({ recipientId, recipientType, type, title, body, data, channel: ['push'] });
  emitNotificationNew(recipientType, recipientId, { type, title, body, data });
  if (recipientType !== 'admin') {
    enqueuePush(recipientType, recipientId, { type, title, body, data });
  }
}

function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Post-commit fan-out: log loudly, never mask the mutation behind a 500. */
async function runSideEffects(label: string, effects: Array<() => Promise<unknown>>): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error(`${label}_side_effect_failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ── Create (customer) ──────────────────────────────────────────────────────

export async function createComplaint(
  customerId: string,
  input: CreateComplaintInput,
): Promise<Complaint> {
  if (!isComplaintType(input.type)) {
    throw ApiError.badRequest(
      `Unknown complaint type "${input.type}" — expected one of: missing_pages, wrong_item, print_quality, damaged_in_transit`,
    );
  }
  const description = input.description?.trim();
  if (!description || description.length < 10) {
    throw ApiError.badRequest('Please describe the issue in at least 10 characters.');
  }
  if (description.length > 2000) {
    throw ApiError.badRequest('Description is too long (2000 characters max).');
  }

  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order || order.customerId !== customerId) {
    throw ApiError.notFound('Order not found');
  }
  if (order.status !== 'delivered') {
    throw ApiError.badRequest('Issues can be reported once the order is delivered.');
  }

  const existing = await prisma.complaint.findFirst({ where: { orderId: order.id } });
  if (existing) {
    throw ApiError.conflict('A claim already exists for this order — you can escalate it from its status card.');
  }

  const evidenceError = validateEvidence(input.type as ComplaintTypeValue, {
    photoUrls: input.photoUrls,
    videoUrl: input.videoUrl,
  });
  if (evidenceError) {
    throw ApiError.badRequest(evidenceError);
  }

  const windowHours = await getComplaintResponseWindowHours();
  const now = new Date();
  const complaint = await prisma.complaint.create({
    data: {
      orderId: order.id,
      customerId,
      sellerId: order.sellerId,
      type: input.type,
      description,
      photoUrls: input.photoUrls,
      ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
      sellerRespondBy: sellerRespondByFrom(now, windowHours),
    },
  });

  await runSideEffects('complaint.created', [
    () =>
      notify(
        order.sellerId,
        'seller',
        'complaint_new',
        `New claim on order #${shortId(order.id)}`,
        `The customer reported "${input.type.replace(/_/g, ' ')}". Respond (accept or reject with a reason) within ${windowHours}h or it auto-escalates to admin.`,
        { orderId: order.id, complaintId: complaint.id },
      ),
    () =>
      notify(
        'admin',
        'admin',
        'complaint_new',
        `Claim filed on order #${shortId(order.id)}`,
        `Routed to the fulfilling seller for a first decision (${windowHours}h window). Admin action only after escalation.`,
        { orderId: order.id, complaintId: complaint.id },
      ),
    () => appendTimelineEvent(order.id, 'complaint_filed', customerId, `Customer reported: ${input.type}`),
  ]);

  return complaint;
}

// ── Read paths ─────────────────────────────────────────────────────────────

export async function listCustomerComplaints(customerId: string, orderId?: string): Promise<Complaint[]> {
  return prisma.complaint.findMany({
    where: { customerId, ...(orderId ? { orderId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listSellerComplaints(sellerId: string): Promise<Complaint[]> {
  return prisma.complaint.findMany({
    where: { sellerId },
    orderBy: [{ status: 'asc' }, { sellerRespondBy: 'asc' }],
  });
}

export async function listAdminComplaints(status?: string): Promise<Complaint[]> {
  if (status) {
    const valid = ['pending_seller', 'seller_accepted', 'seller_rejected', 'escalated', 'refunded', 'closed'];
    if (!valid.includes(status)) {
      throw ApiError.badRequest(`Unknown complaint status filter "${status}"`);
    }
  }
  return prisma.complaint.findMany({
    where: status ? { status: status as ComplaintStatus } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: COMPLAINT_INCLUDE,
  });
}

export interface ComplaintDetail {
  complaint: Complaint;
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: unknown;
    createdAt: Date;
    estimatedDelivery: Date;
  };
  customer: { id: string; name: string; email: string | null; phone: string | null };
  seller: { id: string; storeName: string };
  delivery: {
    status: string;
    deliveredAt: Date | null;
    failedAt: Date | null;
    failReason: string | null;
  } | null;
  timeline: Array<{ status: string; label: string; timestamp: Date; note?: string }>;
}

async function loadVisibleComplaint(actor: Actor, complaintId: string): Promise<ComplaintDetail> {
  const row = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: COMPLAINT_INCLUDE,
  });
  if (!row) throw ApiError.notFound('Complaint not found');

  const isCustomer = actor.role === 'CUSTOMER' && row.customerId === actor.userId;
  const isSeller = actor.role === 'SELLER' && row.sellerId === actor.sellerId;
  if (!isCustomer && !isSeller && actor.role !== 'ADMIN') {
    throw ApiError.forbidden('You are not a participant in this claim');
  }

  const [delivery, timelineDoc] = await Promise.all([
    prisma.delivery.findUnique({ where: { orderId: row.orderId } }),
    OrderTimelineModel.findOne({ orderId: row.orderId }).lean(),
  ]);

  return {
    complaint: row,
    order: row.order,
    customer: row.customer,
    seller: row.seller,
    delivery: delivery
      ? {
          status: delivery.status,
          deliveredAt: delivery.deliveredAt,
          failedAt: delivery.failedAt,
          failReason: delivery.failReason,
        }
      : null,
    timeline: (timelineDoc?.timeline ?? []) as ComplaintDetail['timeline'],
  };
}

export const getComplaintDetail = loadVisibleComplaint;

// ── Seller decisions ───────────────────────────────────────────────────────

async function loadSellerComplaint(sellerId: string, complaintId: string): Promise<Complaint> {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint || complaint.sellerId !== sellerId) {
    throw ApiError.notFound('Complaint not found');
  }
  return complaint;
}

/** Seller accepts → refundOrderToSource fires immediately (idempotent-safe). */
export async function sellerAccept(
  sellerId: string,
  complaintId: string,
  input: { sealIntact?: boolean },
): Promise<Complaint> {
  const complaint = await loadSellerComplaint(sellerId, complaintId);
  if (!canSellerDecide(complaint.status)) {
    throw ApiError.conflict(`This claim is "${complaint.status}" — the seller decision window has closed.`);
  }

  const accepted = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: 'seller_accepted',
      sellerResponseAt: new Date(),
      resolvedBy: 'seller',
      ...(typeof input.sealIntact === 'boolean' ? { sealIntact: input.sealIntact } : {}),
    },
  });

  const refund = await refundOrderToSource(
    complaint.orderId,
    `Seller accepted claim ${complaint.id} (${complaint.type})`,
  );

  const final = refund.refunded
    ? await prisma.complaint.update({
        where: { id: complaint.id },
        data: { status: 'refunded', refundedAt: new Date() },
      })
    : accepted;

  await runSideEffects('complaint.seller_accept', [
    () =>
      notify(
        complaint.customerId,
        'customer',
        'complaint_accepted',
        `Your claim on order #${shortId(complaint.orderId)} was accepted`,
        refund.refunded
          ? 'The store accepted your claim — your refund is on its way to the original payment source.'
          : 'The store accepted your claim — refund processing hit an issue and our team will resolve it shortly.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      notify(
        'admin',
        'admin',
        'complaint_accepted',
        `Seller accepted claim on order #${shortId(complaint.orderId)}`,
        `Refund ${refund.refunded ? `issued via ${refund.channel}` : 'FAILED — ops retry needed'}.`,
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      appendTimelineEvent(
        complaint.orderId,
        'complaint_accepted',
        sellerId,
        `Seller accepted the customer's claim (${complaint.type})`,
      ),
  ]);

  return final;
}

/** Seller rejects — a reason is MANDATORY. */
export async function sellerReject(
  sellerId: string,
  complaintId: string,
  input: { reason: string; sealIntact?: boolean },
): Promise<Complaint> {
  const complaint = await loadSellerComplaint(sellerId, complaintId);
  if (!canSellerDecide(complaint.status)) {
    throw ApiError.conflict(`This claim is "${complaint.status}" — the seller decision window has closed.`);
  }
  const reason = input.reason?.trim();
  if (!reason) {
    throw ApiError.badRequest('A reason is required when rejecting a claim.');
  }
  if (reason.length > 500) {
    throw ApiError.badRequest('Rejection reason is too long (500 characters max).');
  }

  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: 'seller_rejected',
      sellerResponseAt: new Date(),
      sellerRejectReason: reason,
      ...(typeof input.sealIntact === 'boolean' ? { sealIntact: input.sealIntact } : {}),
    },
  });

  await runSideEffects('complaint.seller_reject', [
    () =>
      notify(
        complaint.customerId,
        'customer',
        'complaint_rejected',
        `Your claim on order #${shortId(complaint.orderId)} was declined`,
        `The store declined your claim: "${reason}". If you disagree, escalate it for admin review.`,
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      notify(
        'admin',
        'admin',
        'complaint_rejected',
        `Seller rejected claim on order #${shortId(complaint.orderId)}`,
        `Reason: "${reason}". Admin action only if the customer escalates.`,
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      appendTimelineEvent(complaint.orderId, 'complaint_rejected', sellerId, `Seller rejected the claim: ${reason}`),
  ]);

  return updated;
}

// ── Customer escalation ────────────────────────────────────────────────────

export async function customerEscalate(
  customerId: string,
  complaintId: string,
  input: { reason?: string },
): Promise<Complaint> {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint || complaint.customerId !== customerId) {
    throw ApiError.notFound('Complaint not found');
  }
  if (!canCustomerEscalate(complaint.status)) {
    throw ApiError.conflict(
      complaint.status === 'pending_seller'
        ? 'The store is still within its response window — escalation opens automatically if they do not respond in time.'
        : 'This claim has already been finalized by admin.',
    );
  }

  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: 'escalated',
      escalatedBy: 'customer',
      escalatedAt: new Date(),
      ...(input.reason?.trim() ? { escalationReason: input.reason.trim().slice(0, 500) } : {}),
    },
  });

  await runSideEffects('complaint.escalated', [
    () =>
      notify(
        complaint.sellerId,
        'seller',
        'complaint_escalated',
        `Claim on order #${shortId(complaint.orderId)} escalated to admin`,
        'The customer disputed your decision — admin will review with full context.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      notify(
        'admin',
        'admin',
        'complaint_escalated',
        `ESCALATED claim on order #${shortId(complaint.orderId)}`,
        `Customer disputed the seller's "${complaint.status.replace('seller_', '')}" decision — your decision is final.`,
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    async () => emitAdminGlobalEvent('complaint.escalated', { orderId: complaint.orderId, complaintId: complaint.id }),
  ]);

  return updated;
}

// ── Admin final tier ───────────────────────────────────────────────────────

async function loadAdminComplaint(complaintId: string): Promise<Complaint> {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw ApiError.notFound('Complaint not found');
  return complaint;
}

/** Admin final decision: refund (idempotent-safe) and mark terminal. */
export async function adminRefund(
  adminId: string,
  complaintId: string,
  input: { note?: string },
): Promise<Complaint> {
  const complaint = await loadAdminComplaint(complaintId);
  if (!canAdminDecide(complaint.status)) {
    throw ApiError.conflict(`This claim is "${complaint.status}" — already finalized.`);
  }
  const order = await prisma.order.findUniqueOrThrow({ where: { id: complaint.orderId } });
  if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refund_failed') {
    throw ApiError.badRequest(
      'No captured payment to refund on this order (COD/unpaid) — close the dispute instead.',
    );
  }

  const refund = await refundOrderToSource(
    order.id,
    `Admin finalized claim ${complaint.id}: refund (${complaint.type})`,
  );
  if (!refund.refunded) {
    throw ApiError.badRequest(
      'Refund could not be issued right now (gateway issue) — the order is marked refund_failed; retry shortly.',
    );
  }

  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: 'refunded',
      refundedAt: new Date(),
      resolvedBy: 'admin',
      ...(input.note?.trim() ? { resolutionNote: input.note.trim().slice(0, 500) } : {}),
    },
  });

  await runSideEffects('complaint.admin_refund', [
    () =>
      notify(
        complaint.customerId,
        'customer',
        'complaint_resolved',
        `Admin resolved your claim on order #${shortId(complaint.orderId)}`,
        'Your claim was upheld — the refund is on its way to the original payment source.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      notify(
        complaint.sellerId,
        'seller',
        'complaint_resolved',
        `Admin upheld the claim on order #${shortId(complaint.orderId)}`,
        'Admin finalized the dispute with a refund.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () => appendTimelineEvent(complaint.orderId, 'complaint_refunded', adminId, 'Admin finalized the claim with a refund'),
  ]);

  return updated;
}

/** Admin final decision: close without refund. */
export async function adminClose(
  adminId: string,
  complaintId: string,
  input: { note?: string },
): Promise<Complaint> {
  const complaint = await loadAdminComplaint(complaintId);
  if (!canAdminDecide(complaint.status)) {
    throw ApiError.conflict(`This claim is "${complaint.status}" — already finalized.`);
  }

  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      status: 'closed',
      resolvedBy: 'admin',
      ...(input.note?.trim() ? { resolutionNote: input.note.trim().slice(0, 500) } : {}),
    },
  });

  await runSideEffects('complaint.admin_close', [
    () =>
      notify(
        complaint.customerId,
        'customer',
        'complaint_closed',
        `Admin reviewed your claim on order #${shortId(complaint.orderId)}`,
        'After reviewing the evidence, admin has closed this dispute without a refund.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () =>
      notify(
        complaint.sellerId,
        'seller',
        'complaint_closed',
        `Claim on order #${shortId(complaint.orderId)} closed by admin`,
        'Admin finalized the dispute — no refund issued.',
        { orderId: complaint.orderId, complaintId: complaint.id },
      ),
    () => appendTimelineEvent(complaint.orderId, 'complaint_closed', adminId, 'Admin closed the claim without refund'),
  ]);

  return updated;
}

/** Admin records the seal-intact yes/no after watching the unboxing video. */
export async function adminSetSealIntact(
  complaintId: string,
  input: { intact: boolean },
): Promise<Complaint> {
  const complaint = await loadAdminComplaint(complaintId);
  if (complaint.type !== 'missing_pages') {
    throw ApiError.badRequest('The seal check only applies to missing-pages claims.');
  }
  return prisma.complaint.update({
    where: { id: complaint.id },
    data: { sealIntact: input.intact },
  });
}

// ── Auto-escalation sweep ──────────────────────────────────────────────────

/**
 * Window expiry: pending complaints past sellerRespondBy auto-escalate to
 * admin (escalatedBy 'system'). Called by the interval sweeper in app.ts and
 * by the check script; returns how many complaints escalated.
 */
export async function escalateExpiredComplaints(now: Date = new Date()): Promise<number> {
  const expired = await prisma.complaint.findMany({
    where: { status: 'pending_seller', sellerRespondBy: { lte: now } },
  });

  let count = 0;
  for (const complaint of expired) {
    // Re-check inside the update to stay safe under concurrent sweeps.
    const updated = await prisma.complaint.updateMany({
      where: { id: complaint.id, status: 'pending_seller' },
      data: { status: 'escalated', escalatedBy: 'system', escalatedAt: now },
    });
    if (updated.count === 0) continue;
    count += 1;

    await runSideEffects('complaint.auto_escalate', [
      () =>
        notify(
          complaint.sellerId,
          'seller',
          'complaint_escalated',
          `Claim on order #${shortId(complaint.orderId)} auto-escalated`,
          'The response window expired without a decision — admin now reviews the claim.',
          { orderId: complaint.orderId, complaintId: complaint.id },
        ),
      () =>
        notify(
          complaint.customerId,
          'customer',
          'complaint_escalated',
          `Your claim on order #${shortId(complaint.orderId)} moved to admin review`,
          'The store did not respond in time — admin will now review your claim.',
          { orderId: complaint.orderId, complaintId: complaint.id },
        ),
      () =>
        notify(
          'admin',
          'admin',
          'complaint_escalated',
          `AUTO-ESCALATED claim on order #${shortId(complaint.orderId)}`,
          'Seller response window expired — your decision is final.',
          { orderId: complaint.orderId, complaintId: complaint.id },
        ),
      async () =>
        emitAdminGlobalEvent('complaint.escalated', { orderId: complaint.orderId, complaintId: complaint.id }),
    ]);
  }
  return count;
}

/** Evidence requirement summary echoed to UIs (mirrors complaintPolicy). */
export function evidenceRulesFor(type: ComplaintTypeValue) {
  return evidenceRequirements(type);
}
