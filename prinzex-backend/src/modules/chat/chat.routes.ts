import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as chatController from './chat.controller';

/**
 * Chat REST API — mounted at /api/chat.
 * The socket namespace (/chat) is the live channel; this endpoint exists for
 * the initial page load + scroll-up pagination ("load older").
 * Customers and sellers only (mirrors the socket access rule).
 */

export const chatParams = z.object({ orderId: z.string().min(1) });

export const chatHistoryQuery = z.object({
  before: z.string().min(1).optional(), // cursor: message id — fetch messages older than this one
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ChatHistoryQuery = z.infer<typeof chatHistoryQuery>;

export const chatRouter = Router();

chatRouter.get(
  '/:orderId/messages',
  authenticate,
  authorizeRoles('CUSTOMER', 'SELLER'),
  validate({ params: chatParams, query: chatHistoryQuery }),
  chatController.getChatHistory,
);
