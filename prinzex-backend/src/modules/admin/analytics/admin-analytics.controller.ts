import { ApiResponse } from '../../../utils/ApiResponse';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminAnalyticsService from './admin-analytics.service';
import type { AnalyticsQuery, KpiQuery, SellerRankingQuery } from './admin-analytics.routes';

/**
 * Platform analytics — read-only, so no logActivity calls (the audit trail
 * records mutations only).
 */

export const getKpi = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query as unknown as KpiQuery;
  const kpi = await adminAnalyticsService.getKpi({
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });
  res.status(200).json(new ApiResponse(200, kpi, 'Platform KPIs fetched'));
});

export const getRevenue = asyncHandler(async (req, res) => {
  const points = await adminAnalyticsService.getRevenueAnalytics(req.query as unknown as AnalyticsQuery);
  res.status(200).json(new ApiResponse(200, points, 'Revenue analytics fetched'));
});

export const getOrders = asyncHandler(async (req, res) => {
  const analytics = await adminAnalyticsService.getOrderAnalytics(req.query as unknown as AnalyticsQuery);
  res.status(200).json(new ApiResponse(200, analytics, 'Order analytics fetched'));
});

export const getGeography = asyncHandler(async (_req, res) => {
  const points = await adminAnalyticsService.getGeographyAnalytics();
  res.status(200).json(new ApiResponse(200, points, 'Geographic analytics fetched'));
});

export const getSellerRanking = asyncHandler(async (req, res) => {
  const ranking = await adminAnalyticsService.getSellerRanking(req.query as unknown as SellerRankingQuery);
  res.status(200).json(new ApiResponse(200, ranking, 'Seller ranking fetched'));
});
