import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles, requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as citiesService from './cities.service';

/** Public: active cities for the storefront picker + coverage forms. */
export const citiesRouter = Router();

citiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cities = await citiesService.listActiveCities();
    res.status(200).json(new ApiResponse(200, cities, 'Cities fetched'));
  }),
);

/** Admin: full registry + create/update (name, active, fee overrides). */
export const adminCitiesRouter = Router();
adminCitiesRouter.use(authenticate, authorizeRoles('ADMIN'));

const citySlugParams = z.object({ slug: z.string().min(1) });
const createCityBody = z.object({ name: z.string().min(1).max(80) });
const updateCityBody = z.object({
  name: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
  deliveryFees: z.record(z.unknown()).nullable().optional(),
  deliveryEtaHours: z.record(z.unknown()).nullable().optional(),
});

adminCitiesRouter.get(
  '/',
  requirePermission('delivery.view'),
  asyncHandler(async (_req, res) => {
    const cities = await citiesService.listAllCities();
    res.status(200).json(new ApiResponse(200, cities, 'Cities fetched'));
  }),
);

adminCitiesRouter.post(
  '/',
  requirePermission('delivery.manage'),
  validate({ body: createCityBody }),
  asyncHandler(async (req, res) => {
    const city = await citiesService.createCity(req.body);
    res.status(201).json(new ApiResponse(201, city, 'City added to the registry'));
  }),
);

adminCitiesRouter.patch(
  '/:slug',
  requirePermission('delivery.manage'),
  validate({ params: citySlugParams, body: updateCityBody }),
  asyncHandler(async (req, res) => {
    const city = await citiesService.updateCity(req.params.slug, req.body);
    res.status(200).json(new ApiResponse(200, city, 'City updated'));
  }),
);
