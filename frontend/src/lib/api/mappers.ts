import type { Store, StoreDetail, ServiceOffering, Review } from '../types';

export function mapBackendStoreToFrontend(b: any, userLat?: number, userLng?: number): Store {
  const storeLat = b.lat;
  const storeLng = b.lng;
  let distanceKm = 0;

  if (userLat != null && userLng != null && storeLat != null && storeLng != null) {
    distanceKm = calculateHaversineDistance(userLat, userLng, storeLat, storeLng);
  }

  return {
    id: b.id,
    name: b.storeName,
    imageUrl: b.logoUrl || '',
    rating: Number(b.averageRating || 0),
    reviewCount: b.reviewCount || 0,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    etaLabel: distanceKm > 0 ? `${Math.round(distanceKm * 5 + 20)}–${Math.round(distanceKm * 5 + 35)} min` : '30–45 min',
    priceRange: '$$',
    tags: b.services?.slice(0, 3).map((s: any) => s.serviceName) || [],
    verified: b.isVerified || false,
    isOpen: isStoreOpen(b.openingTime, b.closingTime, b.metadata),
    matchedService: b.matchedService,
  };
}

export function mapBackendServiceToFrontend(s: any): ServiceOffering {
  return {
    id: s.serviceId || s.id,
    name: s.serviceName,
    icon: 'file', // Map category to icon
    startingPrice: Number(s.basePrice),
    unit: 'per page',
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

const DEFAULT_HOURS = [
  { day: 'Monday', open: '09:00', close: '21:00' },
  { day: 'Tuesday', open: '09:00', close: '21:00' },
  { day: 'Wednesday', open: '09:00', close: '21:00' },
  { day: 'Thursday', open: '09:00', close: '21:00' },
  { day: 'Friday', open: '09:00', close: '21:00' },
  { day: 'Saturday', open: '10:00', close: '18:00' },
  { day: 'Sunday', closed: true },
];

export function mapBackendStoreDetailToFrontend(b: any, reviews: any[] = []): StoreDetail {
  return {
    ...mapBackendStoreToFrontend(b),
    description: b.description || '',
    address: b.storeAddress ? `${b.storeAddress}, ${b.city}, ${b.state} ${b.pincode}` : b.address || '',
    phone: b.phone || '',
    email: b.email || '',
    responseTime: 'Replies in ~15 min',
    hours: b.metadata?.hours || DEFAULT_HOURS,
    services: b.services?.map(mapBackendServiceToFrontend) || [],
    reviews: reviews.map(mapBackendReviewToFrontend),
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, // Calculate if needed
  };
}

/** Basic haversine distance formula for frontend usage. */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Check if current time is within opening and closing hours. */
export function isStoreOpen(open?: string, close?: string, metadata?: any): boolean {
  let meta = metadata;
  if (typeof metadata === 'string') {
    try {
      meta = JSON.parse(metadata);
    } catch {
      meta = {};
    }
  }

  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[now.getDay()];

  if (meta?.hours && Array.isArray(meta.hours)) {
    const todayHours = meta.hours.find((h: any) => h.day.toLowerCase() === todayName.toLowerCase());
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
