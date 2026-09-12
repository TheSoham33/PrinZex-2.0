import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminAnalyticsController from './admin-analytics.controller';

/**
 * Platform analytics — mounted at /api/admin/analytics.
 * Spec's canViewAnalytics → analytics.view (read-only module).
 */

export const kpiQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const analyticsQuery = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export const sellerRankingQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['revenue', 'orders', 'rating']).default('revenue'),
});

export type KpiQuery = z.infer<typeof kpiQuery>;
export type AnalyticsQuery = z.infer<typeof analyticsQuery>;
export type SellerRankingQuery = z.infer<typeof sellerRankingQuery>;

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.use(requirePermission('analytics.view'));

adminAnalyticsRouter.get('/kpi', validate({ query: kpiQuery }), adminAnalyticsController.getKpi);
adminAnalyticsRouter.get('/revenue', validate({ query: analyticsQuery }), adminAnalyticsController.getRevenue);
adminAnalyticsRouter.get('/orders', validate({ query: analyticsQuery }), adminAnalyticsController.getOrders);
adminAnalyticsRouter.get('/geography', adminAnalyticsController.getGeography);
adminAnalyticsRouter.get('/sellers', validate({ query: sellerRankingQuery }), adminAnalyticsController.getSellerRanking);
