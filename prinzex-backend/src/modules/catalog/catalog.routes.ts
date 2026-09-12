import { Router } from 'express';
import { requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as catalogController from './catalog.controller';
import { catalogKeyParam, replaceCatalogBody } from './catalog.schemas';

/**
 * Catalogue — mounted at /api/catalog (public read, like /api/content) and
 * /api/admin/catalog (admin writes behind the shared ADMIN parent guard).
 */

export const publicCatalogRouter = Router();
publicCatalogRouter.get('/', catalogController.getCatalog);
publicCatalogRouter.get('/:key', catalogController.getCatalogEntry);

export const adminCatalogRouter = Router();
adminCatalogRouter.get(
  '/',
  requirePermission('catalog.view'),
  catalogController.adminGetCatalog,
);
adminCatalogRouter.put(
  '/:key',
  requirePermission('catalog.manage'),
  validate({ params: catalogKeyParam, body: replaceCatalogBody }),
  catalogController.adminReplaceCatalogEntry,
);
