'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Storefront city selection (multi-city). Persisted in localStorage so the
 * picker survives visits; defaults to the platform's first city (kolkata).
 * Store discovery and city-scoped copy read from this context.
 */

const STORAGE_KEY = 'prinzex-city-slug';

export interface CitySelection {
  slug: string;
  name: string;
}

interface CityContextValue extends CitySelection {
  /** Remembered selection; `name` may be refreshed by the picker's registry. */
  setCity: (slug: string, name: string) => void;
}

const CityContext = createContext<CityContextValue>({
  slug: 'kolkata',
  name: 'Kolkata',
  setCity: () => undefined,
});

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<CitySelection>({ slug: 'kolkata', name: 'Kolkata' });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CitySelection;
        if (parsed?.slug && parsed?.name) setSelection(parsed);
      }
    } catch {
      /* storage unavailable — default city */
    }
  }, []);

  const setCity = useCallback((slug: string, name: string) => {
    const next = { slug, name };
    setSelection(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — session-only selection */
    }
  }, []);

  return <CityContext.Provider value={{ ...selection, setCity }}>{children}</CityContext.Provider>;
}

export const useCity = (): CityContextValue => useContext(CityContext);
