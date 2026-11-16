'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * The shopper's chosen delivery location (pincode or GPS point). Persisted
 * in localStorage so the "Delivering to …" chip survives pages and visits.
 *
 * Precedence when resolving what bounds the store list (StoreListing):
 *   1. this explicit choice (pincode typed/area picked, or GPS accepted here)
 *   2. the signed-in customer's default saved address pincode
 *   3. a fresh browser geolocation
 *   4. nothing → the storefront renders the location prompt
 */

const STORAGE_KEY = 'prinzex-delivery-location';

export type DeliveryLocationSource = 'pincode' | 'gps';

export interface DeliveryLocation {
  source: DeliveryLocationSource;
  pincode?: string;
  lat?: number;
  lng?: number;
  /** Human label for the header chip ("700091", "Salt Lake · 700064", "your location"). */
  label: string;
  savedAt: string;
}

interface DeliveryLocationValue {
  location: DeliveryLocation | null;
  hasLocation: boolean;
  setPincode: (pincode: string, label?: string) => void;
  setGps: (lat: number, lng: number, label?: string) => void;
  clear: () => void;
}

const DeliveryLocationContext = createContext<DeliveryLocationValue>({
  location: null,
  hasLocation: false,
  setPincode: () => undefined,
  setGps: () => undefined,
  clear: () => undefined,
});

export function DeliveryLocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DeliveryLocation;
        if (parsed && (parsed.pincode || (parsed.lat !== undefined && parsed.lng !== undefined))) {
          setLocation(parsed);
        }
      }
    } catch {
      /* storage unavailable — start unpinned */
    }
  }, []);

  const persist = useCallback((next: DeliveryLocation | null) => {
    setLocation(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* session-only */
    }
  }, []);

  const setPincode = useCallback(
    (pincode: string, label?: string) =>
      persist({ source: 'pincode', pincode, label: label ?? pincode, savedAt: new Date().toISOString() }),
    [persist],
  );

  const setGps = useCallback(
    (lat: number, lng: number, label?: string) =>
      persist({ source: 'gps', lat, lng, label: label ?? 'your location', savedAt: new Date().toISOString() }),
    [persist],
  );

  const clear = useCallback(() => persist(null), [persist]);

  return (
    <DeliveryLocationContext.Provider
      value={{ location, hasLocation: location !== null, setPincode, setGps, clear }}
    >
      {children}
    </DeliveryLocationContext.Provider>
  );
}

export const useDeliveryLocation = (): DeliveryLocationValue => useContext(DeliveryLocationContext);
