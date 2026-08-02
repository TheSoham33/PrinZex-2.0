import { z } from 'zod';

/**
 * Public store discovery request schemas.
 */

export const listStoresQuery = z
  .object({
    city: z.string().trim().min(2).max(60).optional(),
    q: z.string().trim().min(1).max(80).optional(),
    services: z.string().trim().max(200).optional(), // comma-separated serviceIds
    minRating: z.coerce.number().min(0).max(5).optional(),
    deliveryTime: z.enum(['same_day', 'next_day', 'standard']).optional(),
    sort: z.enum(['relevance', 'rating', 'distance', 'price_asc']).default('relevance'),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => value.sort !== 'distance' || (value.lat !== undefined && value.lng !== undefined), {
    message: 'lat and lng are required for distance sort',
    path: ['lat'],
  });

export const storeParams = z.object({ sellerId: z.string().trim().min(1) });

export const storeReviewsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
});

export const suggestionsQuery = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters').max(80),
  city: z.string().trim().min(2).max(60).optional(),
});

export type ListStoresQuery = z.infer<typeof listStoresQuery>;
export type StoreReviewsQuery = z.infer<typeof storeReviewsQuery>;
export type SuggestionsQuery = z.infer<typeof suggestionsQuery>;
