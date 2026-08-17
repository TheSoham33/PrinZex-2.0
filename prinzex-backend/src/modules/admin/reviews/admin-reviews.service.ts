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
import type { ReviewsQuery } from './admin-reviews.routes';

/**
 * Review moderation — scoped to STORE reviews (rider reviews have their own
 * delivery lane). Deletion recalculates Seller.averageRating inside the SAME
 * Prisma transaction, so the rating can never drift from the review set.
 */

export interface AdminReviewListItem {
  id: string;
  orderId: string;
  customerName: string;
  storeName: string;
  sellerId: string;
  rating: number;
  comment: string | null;
  isFlagged: boolean;
  isVerified: boolean;
  photoUrls: string[];
  createdAt: Date;
}

export async function listReviews(query: ReviewsQuery): Promise<PaginatedResponse<AdminReviewListItem>> {
  const where: Prisma.ReviewWhereInput = { entityType: 'STORE' };
  if (query.isFlagged !== undefined) where.isFlagged = query.isFlagged === 'true';
  if (query.sellerId) where.entityId = query.sellerId;
  if (query.minRating !== undefined || query.maxRating !== undefined) {
    where.overallRating = {
      ...(query.minRating !== undefined ? { gte: query.minRating } : {}),
      ...(query.maxRating !== undefined ? { lte: query.maxRating } : {}),
    };
  }

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const total = await prisma.review.count({ where });
  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: { customer: { select: { name: true } } },
  });

  const sellers = await prisma.seller.findMany({
    where: { id: { in: [...new Set(reviews.map((review) => review.entityId))] } },
    select: { id: true, storeName: true },
  });
  const storeNameById = new Map(sellers.map((seller) => [seller.id, seller.storeName]));

  return buildPaginatedResponse(
    reviews.map((review) => ({
      id: review.id,
      orderId: review.orderId,
      customerName: review.customer.name,
      storeName: storeNameById.get(review.entityId) ?? '(unknown store)',
      sellerId: review.entityId,
      rating: review.overallRating,
      comment: review.comment,
      isFlagged: review.isFlagged,
      isVerified: review.isVerified,
      photoUrls: review.photoUrls,
      createdAt: review.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

export async function flagReview(reviewId: string): Promise<{ reviewId: string; isFlagged: boolean }> {
  const review = await prisma.review.findFirst({ where: { id: reviewId, entityType: 'STORE' } });
  if (!review) {
    throw ApiError.notFound('Review not found');
  }
  if (review.isFlagged) {
    throw ApiError.conflict('This review is already flagged');
  }
  await prisma.review.update({ where: { id: review.id }, data: { isFlagged: true } });
  return { reviewId: review.id, isFlagged: true };
}

export async function deleteReview(reviewId: string, reason: string): Promise<{ reviewId: string; deleted: boolean; newAverageRating: number }> {
  const review = await prisma.review.findFirst({ where: { id: reviewId, entityType: 'STORE' } });
  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  const newAverageRating = await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: review.id } });
    // Recalculate from the surviving set — same transaction, so a crash
    // mid-way cannot leave a stale average attached to fewer reviews.
    const aggregate = await tx.review.aggregate({
      where: { entityType: 'STORE', entityId: review.entityId },
      _avg: { overallRating: true },
    });
    const average = roundMoney(Number(aggregate._avg.overallRating ?? 0));
    await tx.seller.update({ where: { id: review.entityId }, data: { averageRating: average } });
    return average;
  });

  try {
    await NotificationModel.create({
      recipientId: review.entityId,
      recipientType: 'seller',
      type: 'review_removed',
      title: 'A review was removed by moderation',
      body: `A ${review.overallRating}★ review on your store was removed: ${reason}. Your new average rating is ${newAverageRating}★.`,
      data: { reviewId: review.id, reason },
      channel: ['push'],
    });
  } catch {
    // best-effort
  }

  return { reviewId: review.id, deleted: true, newAverageRating };
}
