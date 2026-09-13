/**
 * User-location resolution for the storefront (gap #8).
 *
 * The store listing sorts and labels shops by distance, so it needs a real
 * coordinate. Resolution order:
 *
 *   1. a REMEMBERED location from the last visit (localStorage) — instant,
 *      no permission prompt fatigue, no Kolkata flash;
 *   2. browser geolocation (promise-wrapped with a timeout);
 *   3. a graceful KOLKATA fallback when geolocation is unavailable, denied,
 *      or times out.
 *
 * Everything browser-touching is guarded (`typeof window === 'undefined'`) so
 * the pure helpers stay importable in Node (jest + check scripts).
 */

export const KOLKATA_COORDS = { lat: 22.5726, lng: 88.3639 } as const;

/** Matches the repo's `prinzex_*` localStorage namespace. */
export const LOCATION_STORAGE_KEY = 'prinzex_user_location';

/** Hard cap so a stuck permission prompt can't leave distances stale forever. */
export const GEOLOCATION_TIMEOUT_MS = 8000;

export type LocationSource = 'remembered' | 'geolocation' | 'fallback';

/** The shape persisted to localStorage (and returned by resolution). */
export interface UserLocation {
  lat: number;
  lng: number;
  /** Best-effort human label (city); null when only raw coords are known. */
  label: string | null;
  source: LocationSource;
  savedAt: string;
}

/** Valid latitude/longitude pair — rejects non-finite and out-of-range input. */
export function isValidCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Strictly parse a persisted location string. Anything malformed (bad JSON,
 * wrong types, out-of-range) returns null so callers fall back cleanly.
 */
export function parseRememberedLocation(raw: string | null): UserLocation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isValidCoordinates(parsed.lat, parsed.lng)) return null;
    return {
      lat: parsed.lat as number,
      lng: parsed.lng as number,
      label:
        typeof parsed.label === 'string' && parsed.label.trim().length > 0
          ? parsed.label
          : null,
      source: 'remembered',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

/** The graceful default when nothing better is available: Kolkata. */
export function fallbackLocation(): UserLocation {
  return { lat: KOLKATA_COORDS.lat, lng: KOLKATA_COORDS.lng, label: 'Kolkata', source: 'fallback', savedAt: '' };
}

/** Read the last saved location (SSR-safe; null when none/unavailable). */
export function loadRememberedLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseRememberedLocation(window.localStorage.getItem(LOCATION_STORAGE_KEY));
  } catch {
    return null; // storage unavailable (private mode, quota) — fall back
  }
}

/** Persist the resolved location for the next visit. Never throws. */
export function saveLocation(loc: Pick<UserLocation, 'lat' | 'lng' | 'label'>): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: UserLocation = {
      ...loc,
      source: 'remembered',
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable — the resolved coords still work for this session.
  }
}

/**
 * Promise-wrapped `navigator.geolocation.getCurrentPosition`: resolves with the
 * position, or null on denial/unavailability/timeout. Never rejects.
 */
export function requestBrowserLocation(
  timeoutMs: number = GEOLOCATION_TIMEOUT_MS,
): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: UserLocation | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    timer = setTimeout(() => finish(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        finish({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: null,
          source: 'geolocation',
          savedAt: new Date().toISOString(),
        }),
      () => finish(null),
      { maximumAge: 5 * 60 * 1000, timeout: timeoutMs },
    );
  });
}
