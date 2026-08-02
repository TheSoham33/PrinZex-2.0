import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import * as storesController from './stores.controller';
import {
  listStoresQuery,
  storeParams,
  storeReviewsQuery,
  suggestionsQuery,
} from './stores.schema';

/**
 * Public store browsing — mounted at /api/stores, no auth required.
 * Note: static routes are registered BEFORE `/:sellerId` so Express does
 * not swallow them as a param.
 */
export const storesRouter = Router();

storesRouter.get('/', validate({ query: listStoresQuery }), storesController.listStores);

storesRouter.get(
  '/search/suggestions',
  validate({ query: suggestionsQuery }),
  storesController.getSuggestions,
);

storesRouter.get('/:sellerId', validate({ params: storeParams }), storesController.getStore);

storesRouter.get(
  '/:sellerId/services',
  validate({ params: storeParams }),
  storesController.getStoreServices,
);

storesRouter.get(
  '/:sellerId/reviews',
  validate({ params: storeParams, query: storeReviewsQuery }),
  storesController.getStoreReviews,
);
