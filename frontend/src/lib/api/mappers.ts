import type { Store, StoreDetail, ServiceOffering, Review } from '../types';

/**
 * Realistic delivery-time estimate derived from the customer's distance to the
 * store (print delivery). No per-store "delivery time" column exists, so this
 * maps a real distance to the delivery windows the app actually offers.
 */
export function deliveryEtaLabel(distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return 'Delivery in 1–3 days';
  if (distanceKm <= 1) return '15–30 min';
  if (distanceKm <= 5) return '30–60 min';
  if (distanceKm <= 15) return '1–2 hours';
  if (distanceKm <= 60) return '1–2 days';
  return '2–3 days';
}

/**
 * Canonical display names for services whose stored name may still be the old
 * one (e.g. rows seeded before the "Printing" → "Document Printing" rename,
 * or before "Hard Binding" became "Hard Binding / Thesis Binding").
 * Guarantees the correct label is shown even if the database hasn't been
 * migrated yet.
 */
const SERVICE_NAME_OVERRIDES: Record<string, string> = {
  'doc-print': 'Document Printing',
  'bind-hard': 'Hard Binding / Thesis Binding',
};

export function normalizeServiceName(
  serviceId: string | undefined,
  serviceName: string,
): string {
  if (serviceId && SERVICE_NAME_OVERRIDES[serviceId]) {
    return SERVICE_NAME_OVERRIDES[serviceId];
  }
  return serviceName;
}

/**
 * The store's B&W per-page rate. Prefers the seller-wide pageRate; falls back
 * to the cheapest per-page service's base price.
 */
function pageRateOf(b: any): number | null {
  const overrides = b?.metadata?.pricingOverrides;
  if (overrides?.pageRate?.bw !== undefined && overrides.pageRate.bw !== null) {
    const value = Number(overrides.pageRate.bw);
    if (Number.isFinite(value)) return value;
  }
  const pageServices = (b?.services ?? []).filter((s: any) =>
    String(s.unit ?? '')
      .toLowerCase()
      .includes('page'),
  );
  if (pageServices.length > 0) {
    const cheapest = pageServices.reduce((min: any, s: any) =>
      Number(s.basePrice) < Number(min.basePrice) ? s : min,
    );
    return Number(cheapest.basePrice);
  }
  return null;
}

export function mapBackendStoreToFrontend(
  b: any,
  userLat?: number,
  userLng?: number,
): Store {
  const storeLat = b.lat;
  const storeLng = b.lng;
  let distanceKm = 0;

  if (
    userLat != null &&
    userLng != null &&
    storeLat != null &&
    storeLng != null
  ) {
    distanceKm = calculateHaversineDistance(
      userLat,
      userLng,
      storeLat,
      storeLng,
    );
  }

  return {
    id: b.id,
    name: b.storeName,
    imageUrl: b.logoUrl || '',
    rating: Number(b.averageRating || 0),
    reviewCount: b.reviewCount || 0,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    etaLabel: deliveryEtaLabel(distanceKm),
    priceRange: '$$',
    tags:
      b.services
        ?.slice(0, 3)
        .map((s: any) => normalizeServiceName(s.serviceId, s.serviceName)) ||
      [],
    verified: b.isVerified || false,
    isOpen: isStoreOpen(b.openingTime, b.closingTime, b.metadata),
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    matchedService: b.matchedService
      ? {
          ...b.matchedService,
          serviceName: normalizeServiceName(
            b.matchedService.id,
            b.matchedService.serviceName,
          ),
        }
      : b.matchedService,
    pagePrice: pageRateOf(b),
  };
}

export function mapBackendServiceToFrontend(s: any): ServiceOffering {
  return {
    id: s.serviceId || s.id,
    name: normalizeServiceName(s.serviceId, s.serviceName),
    minQuantity:
      typeof s.minQuantity === 'number' && s.minQuantity > 1
        ? s.minQuantity
        : undefined,
    minPages:
      typeof s.minPages === 'number' && s.minPages > 0
        ? s.minPages
        : undefined,
    icon: 'file', // Map category to icon
    startingPrice: Number(s.basePrice),
    unit: s.unit || 'per page',
    description: s.description || '',
  };
}

export function mapBackendReviewToFrontend(r: any): Review {
  return {
    id: r.id,
    customerName: r.customerName || 'Customer',
    avatarInitials: (r.customerName || 'C').charAt(0),
    rating: r.overallRating,
    date: r.createdAt,
    comment: r.comment || '',
  };
}

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/**
 * When a seller hasn't configured per-day hours (metadata.hours), derive a
 * uniform 7-day schedule from their opening/closing times so the detail page
 * never shows a hardcoded default that disagrees with the store listing.
 */
function synthesizeHours(openingTime?: string, closingTime?: string) {
  if (!openingTime || !closingTime) return null;
  return DAY_NAMES.map((day) => ({
    day,
    open: openingTime,
    close: closingTime,
  }));
}

export function mapBackendStoreDetailToFrontend(
  b: any,
  reviews: any[] = [],
): StoreDetail {
  const openingTime = b.openingTime;
  const closingTime = b.closingTime;

  // Seller-defined cover customization availability lives in metadata.
  // A key present in the price map means the option is offered by the store.
  const pricingOverrides =
    b.metadata && typeof b.metadata === 'object' && !Array.isArray(b.metadata)
      ? (b.metadata.pricingOverrides ?? {})
      : {};

  return {
    ...mapBackendStoreToFrontend(b),
    description: b.description || '',
    address: b.storeAddress
      ? `${b.storeAddress}, ${b.city}, ${b.state} ${b.pincode}`
      : b.address || '',
    phone: b.phone || '',
    email: b.email || '',
    responseTime: 'Replies in ~15 min',
    openingTime: openingTime || '09:00',
    closingTime: closingTime || '21:00',
    hours: b.metadata?.hours || synthesizeHours(openingTime, closingTime) || [],
    services:
      b.services?.map((service: any) => {
        const mapped = mapBackendServiceToFrontend(service);
        const paperOptions =
          pricingOverrides.servicePaperOptions?.[service.serviceId] ?? {};
        return {
          ...mapped,
          paperTypePrices: paperOptions.paperTypes,
          paperSizePrices: paperOptions.paperSizes,
          availableColorModes:
            service.serviceId === 'doc-print' &&
            pricingOverrides.documentColorModes
              ? (['bw', 'color'] as const).filter(
                  (mode) => pricingOverrides.documentColorModes[mode],
                )
              : undefined,
          twinLoopOptions:
            service.serviceId === 'bind-twin-loop'
              ? pricingOverrides.twinLoopOptions
              : undefined,
          quantitySlabs: pricingOverrides.quantitySlabs?.[service.serviceId],
          staplingOptions:
            service.serviceId === 'doc-print'
              ? pricingOverrides.staplingOptions
              : undefined,
          filmThicknessOptions:
            service.serviceId === 'lam-film'
              ? pricingOverrides.filmThicknessOptions
              : undefined,
        };
      }) || [],
    reviews: reviews.map(mapBackendReviewToFrontend),
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, // Calculate if needed
    availableCoverTypes: pricingOverrides.coverType
      ? Object.keys(pricingOverrides.coverType)
      : undefined,
    availableCoilTypes: pricingOverrides.coilType
      ? Object.keys(pricingOverrides.coilType)
      : undefined,
    availableCoverColors: pricingOverrides.coverColor
      ? Object.keys(pricingOverrides.coverColor)
      : undefined,
    availableHardCoverColors: Array.isArray(pricingOverrides.hardCoverColors)
      ? pricingOverrides.hardCoverColors
      : undefined,
    availableHardFoilColors: Array.isArray(pricingOverrides.hardFoilColors)
      ? pricingOverrides.hardFoilColors
      : undefined,
    availableTapeColors: Array.isArray(pricingOverrides.tapeColors)
      ? pricingOverrides.tapeColors
      : undefined,
  };
}

/** Basic haversine distance formula for frontend usage. */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Check if current time is within opening and closing hours. */
export function isStoreOpen(
  open?: string,
  close?: string,
  metadata?: any,
): boolean {
  let meta = metadata;
  if (typeof metadata === 'string') {
    try {
      meta = JSON.parse(metadata);
    } catch {
      meta = {};
    }
  }

  const now = new Date();
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayName = dayNames[now.getDay()];

  if (meta?.hours && Array.isArray(meta.hours)) {
    const todayHours = meta.hours.find(
      (h: any) => h.day.toLowerCase() === todayName.toLowerCase(),
    );
    if (todayHours) {
      if (todayHours.closed) return false;
      if (todayHours.open && todayHours.close) {
        open = todayHours.open;
        close = todayHours.close;
      }
    }
  }

  if (!open || !close) return true; // Default to open if no hours set

  const [nowH, nowM] = [now.getHours(), now.getMinutes()];
  const currentMinutes = nowH * 60 + nowM;

  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}
