import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminReviewsController from './admin-reviews.controller';

/**
 * Review moderation — mounted at /api/admin/reviews.
 * Spec's canManageSellers → vocabulary: reads sellers.view, mutations sellers.manage.
 * (Spec endpoint home — the file-structure list named only 6 modules;
 * review management lives in its own folder per one-folder-per-feature.)
 */

export const reviewsQuery = z.object({
  isFlagged: z.enum(['true', 'false']).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  sellerId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewParams = z.object({ reviewId: z.string().min(1) });

export const deleteReviewBody = z.object({ reason: z.string().trim().min(3).max(500) });

export type ReviewsQuery = z.infer<typeof reviewsQuery>;
export type DeleteReviewBody = z.infer<typeof deleteReviewBody>;

export const adminReviewsRouter = Router();

adminReviewsRouter.get('/', requirePermission('sellers.view'), validate({ query: reviewsQuery }), adminReviewsController.listReviews);
adminReviewsRouter.post(
  '/:reviewId/flag',
  requirePermission('sellers.manage'),
  validate({ params: reviewParams }),
  adminReviewsController.flagReview,
);
adminReviewsRouter.delete(
  '/:reviewId',
  requirePermission('sellers.manage'),
  validate({ params: reviewParams, body: deleteReviewBody }),
  adminReviewsController.deleteReview,
);
