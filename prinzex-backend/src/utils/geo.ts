/**
 * Geo utilities — pure, dependency-free distance math.
 * Used by delivery auto-assignment (candidate scoring), store distance sort
 * and ETA estimation in the tracking hot path.
 */

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine formula — straight-line distance between two lat/lng points. */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Lat/lng bounding box for a center point + radius (cheap pre-filter before exact haversine). */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32; // 1° latitude ≈ 111.32 km everywhere
  const lngDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)) || 1e-9); // 1° longitude shrinks with latitude
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/** Straight-line ETA in minutes at an assumed rider speed. */
export function estimateEtaMinutes(distanceKm: number, speedKmh = 30): number {
  if (distanceKm <= 0) return 0;
  return Math.ceil((distanceKm / speedKmh) * 60);
}
