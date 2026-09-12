import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminReviewsService from './admin-reviews.service';
import type { DeleteReviewBody, ReviewsQuery } from './admin-reviews.routes';

/** Review moderation. logActivity is fire-and-forget (no await). */

export const listReviews = asyncHandler(async (req, res) => {
  const result = await adminReviewsService.listReviews(req.query as unknown as ReviewsQuery);
  res.status(200).json(new ApiResponse(200, result, 'Reviews fetched'));
});

export const flagReview = asyncHandler(async (req, res) => {
  const result = await adminReviewsService.flagReview(req.params.reviewId);
  void logActivity({
    ...adminIdentity(req),
    action: 'review.flagged',
    entityType: 'review',
    entityId: req.params.reviewId,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Review flagged for moderation'));
});

export const deleteReview = asyncHandler(async (req, res) => {
  const { reason } = req.body as DeleteReviewBody;
  const result = await adminReviewsService.deleteReview(req.params.reviewId, reason);
  void logActivity({
    ...adminIdentity(req),
    action: 'review.deleted',
    entityType: 'review',
    entityId: req.params.reviewId,
    metadata: { reason, newAverageRating: result.newAverageRating },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Review deleted — seller rating recalculated'));
});
