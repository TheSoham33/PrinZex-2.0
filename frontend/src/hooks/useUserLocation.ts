'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fallbackLocation,
  loadRememberedLocation,
  requestBrowserLocation,
  saveLocation,
  type LocationSource,
  type UserLocation,
} from '@/lib/geo/location';

/**
 * Storefront location hook (gap #8).
 *
 *   - a remembered location (from a previous visit) is used instantly;
 *   - otherwise the browser is asked once; success is saved for next time;
 *   - denial / unavailability / timeout falls back to Kolkata.
 *
 * The hook always returns usable coordinates immediately (remembered or the
 * Kolkata fallback) so the first paint never has blank distances; `ready`
 * flips once the resolution is settled, and `refresh` re-prompts the browser.
 */
export interface UseUserLocationResult {
  lat: number;
  lng: number;
  label: string | null;
  source: LocationSource;
  /** True once resolution settled (remembered instantly, geolocation after the
   *  browser answers, or the fallback after a refusal). */
  ready: boolean;
  /** Re-prompt the browser — useful after a previous denial. */
  refresh: () => void;
}

export function useUserLocation(): UseUserLocationResult {
  // Read once (client-only; undefined sentinel guards against double reads).
  const rememberedRef = useRef<UserLocation | null | undefined>(undefined);
  if (rememberedRef.current === undefined) {
    rememberedRef.current = loadRememberedLocation();
  }
  const remembered = rememberedRef.current;

  const [location, setLocation] = useState<UserLocation>(remembered ?? fallbackLocation());
  const [ready, setReady] = useState<boolean>(remembered !== null);
  const inFlight = useRef(false);

  const applyGeolocation = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    void requestBrowserLocation().then((found) => {
      inFlight.current = false;
      if (found) {
        saveLocation(found); // remember for the next visit
        setLocation({ ...found, source: 'geolocation' });
      }
      setReady(true);
    });
  }, []);

  // Prompt only when nothing was remembered — avoids pestering returning users.
  useEffect(() => {
    if (remembered === null) {
      applyGeolocation();
    }
  }, [remembered, applyGeolocation]);

  const refresh = useCallback(() => applyGeolocation(), [applyGeolocation]);

  return {
    lat: location.lat,
    lng: location.lng,
    label: location.label,
    source: location.source,
    ready,
    refresh,
  };
}
