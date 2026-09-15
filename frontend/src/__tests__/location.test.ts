/**
 * Pure helpers for the store-listing geolocation (gap #8) — no DOM needed.
 * The browser-touching pieces (localStorage / navigator.geolocation) are
 * guarded by `typeof window === 'undefined'`, so these helpers import cleanly
 * under the node test environment.
 */
import {
  KOLKATA_COORDS,
  LOCATION_STORAGE_KEY,
  fallbackLocation,
  isValidCoordinates,
  parseRememberedLocation,
} from '@/lib/geo/location';

describe('user location (store listing geo)', () => {
  it('falls back to the Kolkata platform default', () => {
    expect(KOLKATA_COORDS).toEqual({ lat: 22.5726, lng: 88.3639 });
    expect(fallbackLocation()).toMatchObject({
      lat: 22.5726,
      lng: 88.3639,
      label: 'Kolkata',
      source: 'fallback',
    });
  });

  it('parses a valid remembered location and stamps its source', () => {
    const parsed = parseRememberedLocation(
      '{"lat":22.57,"lng":88.36,"label":"Kolkata","savedAt":"2026-09-12T00:00:00.000Z"}',
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.lat).toBe(22.57);
    expect(parsed!.lng).toBe(88.36);
    expect(parsed!.label).toBe('Kolkata');
    expect(parsed!.source).toBe('remembered');
  });

  it('rejects malformed remembered locations', () => {
    expect(parseRememberedLocation(null)).toBeNull();
    expect(parseRememberedLocation('')).toBeNull();
    expect(parseRememberedLocation('not json')).toBeNull();
    expect(parseRememberedLocation('{"lat":"x","lng":1}')).toBeNull();
    expect(parseRememberedLocation('{"lat":91,"lng":0}')).toBeNull(); // lat out of range
    expect(parseRememberedLocation('{"lat":22,"lng":200}')).toBeNull(); // lng out of range
    expect(parseRememberedLocation('{"lat":22}')).toBeNull(); // missing lng
  });

  it('validates coordinate ranges and types', () => {
    expect(isValidCoordinates(22.5, 88.3)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(NaN, 88.3)).toBe(false);
    expect(isValidCoordinates(22.5, 200)).toBe(false);
    expect(isValidCoordinates(-91, 0)).toBe(false);
    expect(isValidCoordinates('22.5', 88.3)).toBe(false);
    expect(isValidCoordinates(undefined, 88.3)).toBe(false);
  });

  it('uses the repo prinzex_ localStorage namespace', () => {
    expect(LOCATION_STORAGE_KEY.startsWith('prinzex_')).toBe(true);
  });
});
