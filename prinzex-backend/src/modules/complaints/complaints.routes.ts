import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as complaintsController from './complaints.controller';

/**
 * Dispute flow, mounted per actor lane so the web client's token resolution
 * (path-prefix based) picks the right JWT:
 *
 *   /api/complaints          customer: POST / (file a claim), GET /mine,
 *                            POST /:id/escalate; GET /:id (any participant)
 *   /api/seller/complaints   seller:   GET /, GET /:id, POST /:id/accept,
 *                            POST /:id/reject
 *   /api/admin/complaints    admin:    GET /, GET /:id, POST /:id/refund,
 *                            POST /:id/close, POST /:id/seal (final tier)
 */

const idParams = z.object({ id: z.string().min(1) });

const createBody = z.object({
  orderId: z.string().min(1),
  type: z.enum(['missing_pages', 'wrong_item', 'print_quality', 'damaged_in_transit']),
  description: z.string().min(1).max(2000),
  photoUrls: z.array(z.string().url().or(z.string().startsWith('/uploads/'))).max(6).default([]),
  videoUrl: z.string().url().or(z.string().startsWith('/uploads/')).nullable().default(null),
});

const decisionBody = z.object({
  reason: z.string().max(500).optional(),
  sealIntact: z.boolean().optional(),
});

const escalateBody = z.object({ reason: z.string().max(500).optional() });
const noteBody = z.object({ note: z.string().max(500).optional() });
const sealBody = z.object({ intact: z.boolean() });
const mineQuery = z.object({ orderId: z.string().optional() });
const adminQuery = z.object({ status: z.string().optional() });

// ── Customer lane ──────────────────────────────────────────────────────────
export const complaintsRouter = Router();

complaintsRouter.post(
  '/',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate({ body: createBody }),
  complaintsController.create,
);
complaintsRouter.get(
  '/mine',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate({ query: mineQuery }),
  complaintsController.listMine,
);
complaintsRouter.post(
  '/:id/escalate',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate({ params: idParams, body: escalateBody }),
  complaintsController.escalate,
);
complaintsRouter.get('/:id', authenticate, validate({ params: idParams }), complaintsController.detail);

// ── Seller lane ────────────────────────────────────────────────────────────
export const sellerComplaintsRouter = Router();
sellerComplaintsRouter.use(authenticate, authorizeRoles('SELLER'));

sellerComplaintsRouter.get('/', complaintsController.listSeller);
sellerComplaintsRouter.get('/:id', validate({ params: idParams }), complaintsController.detail);
sellerComplaintsRouter.post(
  '/:id/accept',
  validate({ params: idParams, body: decisionBody }),
  complaintsController.accept,
);
sellerComplaintsRouter.post(
  '/:id/reject',
  validate({ params: idParams, body: decisionBody }),
  complaintsController.reject,
);

// ── Admin lane (final tier) ────────────────────────────────────────────────
export const adminComplaintsRouter = Router();
adminComplaintsRouter.use(authenticate, authorizeRoles('ADMIN'));

adminComplaintsRouter.get('/', validate({ query: adminQuery }), complaintsController.listAdmin);
adminComplaintsRouter.get('/:id', validate({ params: idParams }), complaintsController.detail);
adminComplaintsRouter.post(
  '/:id/refund',
  validate({ params: idParams, body: noteBody }),
  complaintsController.refund,
);
adminComplaintsRouter.post(
  '/:id/close',
  validate({ params: idParams, body: noteBody }),
  complaintsController.close,
);
adminComplaintsRouter.post(
  '/:id/seal',
  validate({ params: idParams, body: sealBody }),
  complaintsController.setSeal,
);
