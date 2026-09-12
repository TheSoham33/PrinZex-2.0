import type { Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as storesService from './stores.service';
import type { ListStoresQuery, StoreReviewsQuery, SuggestionsQuery } from './stores.schema';

/** Public store discovery controllers (no auth required). */

function sendCached<T>(res: Response, cached: storesService.CachedResult<T>, message: string): void {
  res.set('X-Cache', cached.cacheHit ? 'HIT' : 'MISS');
  res.status(200).json(new ApiResponse(200, cached.result, message));
}

export const listStores = asyncHandler(async (req, res) => {
  const result = await storesService.listStores(req.query as unknown as ListStoresQuery);
  sendCached(res, result, 'Stores fetched');
});

export const listServiceCategories = asyncHandler(async (_req, res) => {
  const categories = await storesService.listServiceCategories();
  res.status(200).json(new ApiResponse(200, { categories }, 'Service categories fetched'));
});

export const getStore = asyncHandler(async (req, res) => {
  const result = await storesService.getStore(req.params.sellerId);
  sendCached(res, result, 'Store fetched');
});

export const getStoreServices = asyncHandler(async (req, res) => {
  const result = await storesService.getStoreServices(req.params.sellerId);
  res.status(200).json(new ApiResponse(200, result, 'Services fetched'));
});

export const getStoreReviews = asyncHandler(async (req, res) => {
  const result = await storesService.getStoreReviews(
    req.params.sellerId,
    req.query as unknown as StoreReviewsQuery,
  );
  res.status(200).json(new ApiResponse(200, result, 'Reviews fetched'));
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const result = await storesService.getSuggestions(req.query as unknown as SuggestionsQuery);
  sendCached(res, result, 'Suggestions fetched');
});
