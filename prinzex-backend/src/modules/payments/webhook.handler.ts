import type { Request, Response } from 'express';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { NotificationModel } from '../../models/mongo/Notification.model';
import {
  creditWalletTopup,
  markOrderPaid,
  markOrderPaymentFailed,
} from './payments.service';
import { isValidWebhookSignature } from './razorpay.client';

/**
 * Razorpay webhook — NO auth middleware; trust is established by the
 * HMAC-SHA256 signature over the RAW body (mounted with express.raw()).
 * Processors are idempotent, so event replays are safe.
 */

interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number; // paise
        notes?: Record<string, unknown>;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number; // paise
        notes?: Record<string, unknown>;
      };
    };
  };
}

function notesObject(entity: { notes?: Record<string, unknown> } | undefined): Record<string, unknown> {
  return entity?.notes && typeof entity.notes === 'object' ? entity.notes : {};
}

async function notifyCustomer(
  customerId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({
    recipientId: customerId,
    recipientType: 'customer',
    type,
    title,
    body,
    data,
    channel: ['push'],
  });
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body as Buffer; // express.raw({ type: 'application/json' })

  if (typeof signature !== 'string' || !isValidWebhookSignature(rawBody, signature)) {
    res.status(400).json({ success: false, statusCode: 400, message: 'Invalid signature', errors: [] });
    return;
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString()) as RazorpayWebhookEvent;
  } catch {
    res.status(400).json({ success: false, statusCode: 400, message: 'Malformed event payload', errors: [] });
    return;
  }

  try {
    await processEvent(event);
  } catch (error) {
    // Per spec we still acknowledge: Razorpay replays on non-200 and every
    // handler here is idempotent, so a logged failure can be safely retried
    // from the dashboard if needed.
    logger.error('razorpay_webhook_processing_failed', {
      event: event.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  res.status(200).json({ status: 'ok' });
}

async function processEvent(event: RazorpayWebhookEvent): Promise<void> {
  logger.info('razorpay_webhook_received', { event: event.event });

  switch (event.event) {
    case 'payment.captured': {
      const entity = event.payload?.payment?.entity;
      if (!entity?.id) return;
      const notes = notesObject(entity);

      // Wallet top-up capture (receipt + notes discriminator).
      const topupCustomerId = typeof notes.topupCustomerId === 'string' ? notes.topupCustomerId : null;
      if (topupCustomerId) {
        const amount = (entity.amount ?? 0) / 100;
        await creditWalletTopup(topupCustomerId, Math.round(amount * 100) / 100, entity.id);
        return;
      }

      // Order payment capture — idempotent shared path.
      const orderId = typeof notes.orderId === 'string' ? notes.orderId : null;
      if (orderId) {
        await markOrderPaid(orderId, entity.id);
      }
      return;
    }

    case 'payment.failed': {
      const entity = event.payload?.payment?.entity;
      const notes = notesObject(entity);
      const orderId = typeof notes.orderId === 'string' ? notes.orderId : null;
      if (orderId) {
        await markOrderPaymentFailed(orderId, entity?.id);
      }
      return;
    }

    case 'refund.created':
    case 'refund.processed': {
      const entity = event.payload?.refund?.entity;
      if (!entity?.payment_id) return;

      // Find the order this refund belongs to via the payment reference.
      const order = await prisma.order.findFirst({ where: { paymentId: entity.payment_id } });
      if (!order) return;

      const amountRupees = Math.round(((entity.amount ?? 0) / 100) * 100) / 100;
      const shortId = order.id.slice(-6).toUpperCase();
      await notifyCustomer(
        order.customerId,
        event.event === 'refund.created' ? 'refund_initiated' : 'refund_processed',
        event.event === 'refund.created' ? 'Refund initiated' : `Refund of ₹${amountRupees} processed`,
        event.event === 'refund.created'
          ? `Your refund for order #${shortId} has been initiated.`
          : `Your refund of ₹${amountRupees} for order #${shortId} has been processed.`,
        { orderId: order.id, refundId: entity.id ?? null, amount: amountRupees },
      );
      // NOTE: refund terminal state is tracked on Order.paymentStatus; a
      // dedicated refund ledger table is a TODO for the reporting step.
      return;
    }

    default:
      // Unhandled event families are acknowledged and skipped.
      return;
  }
}
