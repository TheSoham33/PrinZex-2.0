import type { Store, StoreDetail, ServiceOffering, Review } from '../types';

export function mapBackendStoreToFrontend(b: any): Store {
  return {
    id: b.id,
    name: b.storeName,
    imageUrl: b.logoUrl || '',
    rating: b.averageRating || 0,
    reviewCount: b.reviewCount || 0,
    distanceKm: 0, // Should be calculated or returned by backend
    etaLabel: '30–45 min',
    priceRange: '$$',
    tags: b.services?.slice(0, 3).map((s: any) => s.serviceName) || [],
    verified: b.isVerified || false,
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

export function mapBackendStoreDetailToFrontend(b: any, reviews: any[] = []): StoreDetail {
  return {
    ...mapBackendStoreToFrontend(b),
    description: b.description || '',
    address: `${b.storeAddress}, ${b.city}, ${b.state} ${b.pincode}`,
    phone: b.phone || '',
    email: b.email || '',
    responseTime: 'Replies in ~15 min',
    hours: [], // Backend metadata.hours
    services: b.services?.map(mapBackendServiceToFrontend) || [],
    reviews: reviews.map(mapBackendReviewToFrontend),
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, // Calculate if needed
  };
}
