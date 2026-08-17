import { createHash } from 'crypto';
import type { Prisma, Seller } from '@prisma/client';
import { prisma } from '../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { getCache, setCache } from '../../utils/cache';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';
import type { ListStoresQuery, StoreReviewsQuery, SuggestionsQuery } from './stores.schema';

/**
 * Public store discovery. Only APPROVED sellers are ever exposed.
 * Bank details, documents, GST, commission and admin internals are never
 * selected (see PUBLIC_SELLER_SELECT).
 */

// ── Shared selects & shapes ────────────────────────────────────────────────

const PUBLIC_SELLER_SELECT = {
  id: true,
  storeName: true,
  ownerName: true,
  email: true,
  phone: true,
  storeAddress: true,
  city: true,
  state: true,
  pincode: true,
  lat: true,
  lng: true,
  openingTime: true,
  closingTime: true,
  logoUrl: true,
  bannerUrl: true,
  description: true,
  status: true,
  deliveryRadius: true,
  isVerified: true,
  averageRating: true,
  totalOrders: true,
  completionRate: true,
  onTimeRate: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.SellerSelect;

const storeListSelect = {
  ...PUBLIC_SELLER_SELECT,
  services: {
    where: { isActive: true },
    orderBy: { basePrice: 'asc' },
    take: 5,
  },
  _count: { select: { orders: true } },
} satisfies Prisma.SellerSelect;

type StoreListRow = Prisma.SellerGetPayload<{ select: typeof storeListSelect }>;

type StoreListItem = Omit<StoreListRow, '_count'> & { 
  orderCount: number; 
  reviewCount: number;
  matchedService?: {
    id: string;
    serviceName: string;
    basePrice: number;
    unit: string;
  } | null;
};

export interface CachedResult<T> {
  result: T;
  cacheHit: boolean;
}

// ── GET /api/stores ────────────────────────────────────────────────────────

export async function listStores(query: ListStoresQuery): Promise<CachedResult<PaginatedResponse<StoreListItem>>> {
  const serviceIds = (query.services ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  // Cache key: spec shape cache:stores:{city}:{page}, plus a fingerprint of
  // every filter so different queries never collide.
  const fingerprint = createHash('sha1')
    .update(
      JSON.stringify({
        q: query.q ?? '',
        services: [...serviceIds].sort(),
        minRating: query.minRating ?? null,
        sort: query.sort,
        lat: query.lat ?? null,
        lng: query.lng ?? null,
        limit: query.limit,
        deliveryTime: query.deliveryTime ?? null,
      }),
    )
    .digest('hex')
    .slice(0, 12);
  const cacheKey = REDIS_KEYS.STORE_LIST((query.city ?? 'all').toLowerCase(), query.page, `${query.limit}-${fingerprint}`);

  const cached = await getCache<PaginatedResponse<StoreListItem>>(cacheKey);
  if (cached) {
    return { result: cached, cacheHit: true };
  }

  // ── where clause ─────────────────────────────────────────────────────────
  const and: Prisma.SellerWhereInput[] = [];
  if (query.q) {
    and.push({
      OR: [
        { storeName: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { services: { some: { serviceName: { contains: query.q, mode: 'insensitive' } } } },
        { services: { some: { categoryName: { contains: query.q, mode: 'insensitive' } } } },
      ],
    });
  }
  if (query.minRating !== undefined) {
    and.push({ averageRating: { gte: query.minRating } });
  }
  // Sellers must offer ALL requested services (one `some` per serviceId).
  for (const serviceId of serviceIds) {
    and.push({ services: { some: { serviceId, isActive: true } } });
  }
  // deliveryTime is accepted for forward compatibility — per-store delivery
  // options are defined in the ordering step; no filtering applied yet.

  const where: Prisma.SellerWhereInput = {
    status: 'APPROVED',
    ...(query.city && query.city.trim().length >= 1 && query.city.trim().toLowerCase() !== 'location'
      ? { city: { contains: query.city.trim(), mode: 'insensitive' } }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });

  let rows: StoreListRow[];
  let total: number;

  if (query.sort === 'distance' || query.sort === 'price_asc') {
    // Computed sorts run in the app layer over a bounded working set.
    const WORKING_SET_LIMIT = 200;
    const candidates = await prisma.seller.findMany({
      where,
      orderBy: [{ averageRating: 'desc' }],
      take: WORKING_SET_LIMIT,
      select: storeListSelect,
    });

    const sorted =
      query.sort === 'distance'
        ? candidates
            .map((seller) => ({
              seller,
              distanceKm: haversineKm(query.lat ?? 0, query.lng ?? 0, seller.lat, seller.lng),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .map((entry) => entry.seller)
        : [...candidates].sort(
            (a, b) => minServicePrice(a.services) - minServicePrice(b.services),
          );

    total = sorted.length;
    rows = sorted.slice(skip, skip + take);
  } else {
    const orderBy =
      query.sort === 'rating'
        ? ([{ averageRating: 'desc' }, { totalOrders: 'desc' }] as const)
        : ([{ totalOrders: 'desc' }, { averageRating: 'desc' }] as const); // relevance
    const [count, page] = await prisma.$transaction([
      prisma.seller.count({ where }),
      prisma.seller.findMany({ where, orderBy: [...orderBy], skip, take, select: storeListSelect }),
    ]);
    total = count;
    rows = page;
  }

  // Review counts are not a Prisma relation (Review is polymorphic), so they
  // are aggregated separately and merged.
  const reviewCounts = await reviewCountsFor(rows.map((row) => row.id));

  // If a search query is provided, find the best matching service for each seller
  // (searching all services, not just the top 5 included in storeListSelect).
  const sellerIds = rows.map((r) => r.id);
  const searchMatches = query.q
    ? await prisma.sellerService.findMany({
        where: {
          sellerId: { in: sellerIds },
          isActive: true,
          OR: [
            { serviceName: { contains: query.q, mode: 'insensitive' } },
            { categoryName: { contains: query.q, mode: 'insensitive' } },
          ],
        },
        orderBy: { basePrice: 'asc' },
      })
    : [];

  const items: StoreListItem[] = rows.map(({ _count, ...seller }) => {
    let matchedService = null;

    if (query.q) {
      const q = query.q.toLowerCase();
      // Find the cheapest matching service from either searchMatches OR the pre-fetched top 5.
      const match =
        searchMatches.find((m) => m.sellerId === seller.id) ||
        seller.services.find(
          (s) =>
            s.serviceName.toLowerCase().includes(q) || s.categoryName.toLowerCase().includes(q),
        );
      if (match) {
        matchedService = {
          id: match.serviceId || match.id,
          serviceName: match.serviceName,
          basePrice: Number(match.basePrice),
          unit: match.unit,
        };
      }
    }

    return {
      ...seller,
      orderCount: _count.orders,
      reviewCount: reviewCounts.get(seller.id) ?? 0,
      matchedService,
    };
  });

  const result = buildPaginatedResponse(items, total, { page: query.page, limit: query.limit });
  await setCache(cacheKey, result, REDIS_TTL.CACHE_LIST);
  return { result, cacheHit: false };
}

// ── GET /api/stores/:sellerId ──────────────────────────────────────────────

const storeDetailSelect = {
  ...PUBLIC_SELLER_SELECT,
  services: { where: { isActive: true }, orderBy: [{ categoryId: 'asc' }, { basePrice: 'asc' }] },
  _count: { select: { orders: true } },
} satisfies Prisma.SellerSelect;

export interface StoreDetail {
  seller: Omit<Prisma.SellerGetPayload<{ select: typeof storeDetailSelect }>, '_count'> & {
    orderCount: number;
    reviewCount: number;
  };
  latestReviews: PublicReview[];
}

export async function getStore(sellerId: string): Promise<CachedResult<StoreDetail>> {
  const cacheKey = REDIS_KEYS.STORE_DETAIL(sellerId);
  const cached = await getCache<StoreDetail>(cacheKey);
  if (cached) {
    return { result: cached, cacheHit: true };
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: storeDetailSelect,
  });
  if (!seller || seller.status !== 'APPROVED') {
    throw ApiError.notFound('Store not found');
  }

  const [reviewCount, latestRows] = await prisma.$transaction([
    prisma.review.count({ where: { entityType: 'STORE', entityId: sellerId, isFlagged: false } }),
    prisma.review.findMany({
      where: { entityType: 'STORE', entityId: sellerId, isFlagged: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const { _count, ...rest } = seller;
  const result: StoreDetail = {
    seller: { ...rest, orderCount: _count.orders, reviewCount },
    latestReviews: latestRows.map(toPublicReview),
  };

  await setCache(cacheKey, result, REDIS_TTL.CACHE_STORE);
  return { result, cacheHit: false };
}

// ── GET /api/stores/:sellerId/services ─────────────────────────────────────

export interface ServiceCategory {
  categoryId: string;
  categoryName: string;
  services: unknown[];
}

export async function getStoreServices(sellerId: string): Promise<{ categories: ServiceCategory[] }> {
  await assertStoreIsPublic(sellerId);

  const services = await prisma.sellerService.findMany({
    where: { sellerId, isActive: true },
    orderBy: [{ categoryId: 'asc' }, { basePrice: 'asc' }],
  });

  const groups = new Map<string, ServiceCategory>();
  for (const service of services) {
    const group = groups.get(service.categoryId) ?? {
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      services: [],
    };
    group.services.push(service);
    groups.set(service.categoryId, group);
  }

  return { categories: [...groups.values()] };
}

// ── GET /api/stores/:sellerId/reviews ──────────────────────────────────────

export async function getStoreReviews(
  sellerId: string,
  query: StoreReviewsQuery,
): Promise<PaginatedResponse<PublicReview>> {
  await assertStoreIsPublic(sellerId);

  const where: Prisma.ReviewWhereInput = {
    entityType: 'STORE',
    entityId: sellerId,
    isFlagged: false,
    ...(query.minRating !== undefined ? { overallRating: { gte: query.minRating } } : {}),
  };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
      skip,
      take,
    }),
  ]);

  return buildPaginatedResponse(rows.map(toPublicReview), total, {
    page: query.page,
    limit: query.limit,
  });
}

// ── GET /api/stores/search/suggestions ─────────────────────────────────────

export interface SearchSuggestions {
  stores: Array<Pick<Seller, 'id' | 'storeName' | 'city' | 'logoUrl'>>;
  services: Array<{
    serviceId: string;
    serviceName: string;
    categoryName: string;
    basePrice: unknown;
    sellerId: string;
    storeName: string;
  }>;
}

export async function getSuggestions(query: SuggestionsQuery): Promise<CachedResult<SearchSuggestions>> {
  const cacheKey = REDIS_KEYS.SEARCH_SUGGESTIONS(query.q, query.city);
  const cached = await getCache<SearchSuggestions>(cacheKey);
  if (cached) {
    return { result: cached, cacheHit: true };
  }

  const cityFilter = query.city
    ? { city: { equals: query.city, mode: 'insensitive' as const } }
    : {};

  const [stores, serviceRows] = await prisma.$transaction([
    prisma.seller.findMany({
      where: {
        status: 'APPROVED',
        ...cityFilter,
        storeName: { contains: query.q, mode: 'insensitive' },
      },
      select: { id: true, storeName: true, city: true, logoUrl: true },
      orderBy: [{ averageRating: 'desc' }],
      take: 5,
    }),
    prisma.sellerService.findMany({
      where: {
        isActive: true,
        serviceName: { contains: query.q, mode: 'insensitive' },
        seller: { status: 'APPROVED', ...cityFilter },
      },
      select: {
        serviceId: true,
        serviceName: true,
        categoryName: true,
        basePrice: true,
        sellerId: true,
        seller: { select: { storeName: true } },
      },
      orderBy: [{ basePrice: 'asc' }],
      take: 5,
    }),
  ]);

  const result: SearchSuggestions = {
    stores,
    services: serviceRows.map(({ seller, ...service }) => ({
      ...service,
      storeName: seller.storeName,
    })),
  };

  await setCache(cacheKey, result, REDIS_TTL.CACHE_SUGGEST);
  return { result, cacheHit: false };
}

// ── Helpers ────────────────────────────────────────────────────────────────

export interface PublicReview {
  id: string;
  overallRating: number;
  qualityRating: number | null;
  deliveryRating: number | null;
  communicationRating: number | null;
  valueRating: number | null;
  comment: string | null;
  photoUrls: string[];
  customerName: string;
  sellerReply: string | null;
  sellerRepliedAt: Date | null;
  createdAt: Date;
}

type ReviewWithCustomer = Prisma.ReviewGetPayload<{
  include: { customer: { select: { name: true } } };
}>;

function toPublicReview(review: ReviewWithCustomer): PublicReview {
  return {
    id: review.id,
    overallRating: review.overallRating,
    qualityRating: review.qualityRating,
    deliveryRating: review.deliveryRating,
    communicationRating: review.communicationRating,
    valueRating: review.valueRating,
    comment: review.comment,
    photoUrls: review.photoUrls,
    customerName: maskCustomerName(review.customer.name),
    sellerReply: review.sellerReply,
    sellerRepliedAt: review.sellerRepliedAt,
    createdAt: review.createdAt,
  };
}

/** "Rahul Kumar" -> "Rahul K."; "Priya" -> "Priya". */
function maskCustomerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] ?? 'Customer';
  }
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${parts[0]} ${lastInitial}.`;
}

async function reviewCountsFor(sellerIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sellerIds.length === 0) {
    return counts;
  }
  const grouped = await prisma.review.groupBy({
    by: ['entityId'],
    where: { entityType: 'STORE', entityId: { in: sellerIds }, isFlagged: false },
    _count: { _all: true },
  });
  for (const group of grouped) {
    counts.set(group.entityId, group._count._all);
  }
  return counts;
}

async function assertStoreIsPublic(sellerId: string): Promise<void> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { status: true },
  });
  if (!seller || seller.status !== 'APPROVED') {
    throw ApiError.notFound('Store not found');
  }
}

/** Great-circle distance in km; sellers without coordinates sort to the end. */
function haversineKm(lat1: number, lng1: number, lat2: number | null, lng2: number | null): number {
  if (lat2 === null || lng2 === null) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minServicePrice(services: Array<{ basePrice: Prisma.Decimal }>): number {
  if (services.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.min(...services.map((service) => Number(service.basePrice)));
}
