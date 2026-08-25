import { ApiResponse } from '../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../utils/activityLogger';
import { asyncHandler } from '../../utils/asyncHandler';
import * as catalogService from './catalog.service';
import type { ReplaceCatalogBody } from './catalog.schemas';

/** Public catalogue reads (storefront, seller dashboard, customer order flow). */

export const getCatalog = asyncHandler(async (_req, res) => {
  const catalog = await catalogService.getCatalog();
  res.status(200).json(new ApiResponse(200, catalog, 'Catalogue fetched'));
});

export const getCatalogEntry = asyncHandler(async (req, res) => {
  const entry = await catalogService.getCatalogEntry(req.params.key);
  res.status(200).json(new ApiResponse(200, entry, 'Catalogue group fetched'));
});

/** Admin catalogue management — writes replace a whole group atomically. */

export const adminGetCatalog = asyncHandler(async (_req, res) => {
  const catalog = await catalogService.getCatalog();
  res.status(200).json(new ApiResponse(200, catalog, 'Catalogue fetched'));
});

export const adminReplaceCatalogEntry = asyncHandler(async (req, res) => {
  const entry = await catalogService.replaceCatalogEntry(
    req.params.key,
    req.body as ReplaceCatalogBody,
  );
  void logActivity({
    ...adminIdentity(req),
    action: 'catalog.group.replaced',
    entityType: 'catalog',
    entityId: entry.key,
    metadata: { label: entry.label },
    req,
  });
  res.status(200).json(new ApiResponse(200, entry, 'Catalogue group saved'));
});
