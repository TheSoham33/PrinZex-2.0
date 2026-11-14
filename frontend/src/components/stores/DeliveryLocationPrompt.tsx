'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchServiceablePincodes, pincodeOptionLabel } from '@/lib/api/pincodes';
import { useDeliveryLocation } from '@/lib/delivery-location';
import { IconAlertCircle, IconMapPin, IconSearch } from '@/components/icons';

const PINCODE_RE = /^[1-9][0-9]{5}$/;

/**
 * "No location yet" state for the storefront: pincode first (quick, no
 * permission needed), area autocomplete from the serviceable registry as
 * the medium-precision alternative, GPS for the exact point, and a link to
 * save a full address for checkout.
 */
export default function DeliveryLocationPrompt({ notice }: { notice?: string | null }) {
  const { setPincode, setGps } = useDeliveryLocation();
  const [pincode, setPincodeInput] = useState('');
  const [area, setArea] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const { data: registry = [] } = useQuery({
    queryKey: ['serviceable-pincodes'],
    queryFn: fetchServiceablePincodes,
    staleTime: 5 * 60_000,
  });

  const areaSuggestions = useMemo(() => {
    const term = area.trim().toLowerCase();
    if (term.length < 2) return [];
    return registry
      .filter(
        (row) =>
          row.zoneLabel.toLowerCase().includes(term) ||
          row.cityName.toLowerCase().includes(term) ||
          row.pincode.startsWith(term),
      )
      .slice(0, 6);
  }, [area, registry]);

  const handleCheck = () => {
    setGpsError(null);
    const value = pincode.trim();
    if (!PINCODE_RE.test(value)) {
      setFormatError('Enter a valid 6-digit pincode (e.g. 700091).');
      return;
    }
    setFormatError(null);
    // Quick client-side serviceability hint; the stores endpoint remains the
    // source of truth and StoreListing renders the definitive state.
    const row = registry.find((r) => r.pincode === value);
    if (registry.length > 0 && !row) {
      setFormatError("We don't deliver to this pincode yet — try another area.");
      return;
    }
    setPincode(value, row ? pincodeOptionLabel(row) : value);
  };

  const handleGps = () => {
    setFormatError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Location is unavailable in this browser — a pincode works too.');
      return;
    }
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => setGps(position.coords.latitude, position.coords.longitude),
      () => setGpsError('Could not get your location — you can still enter a pincode.'),
      { timeout: 8000 },
    );
  };

  return (
    <section className="card mx-auto max-w-xl p-6 text-center">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">Where should we deliver?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Enter your pincode to see print shops that deliver to you.
      </p>

      {notice && (
        <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {notice}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          className="input flex-1"
          inputMode="numeric"
          maxLength={6}
          placeholder="Pincode e.g. 700091"
          value={pincode}
          onChange={(e) => {
            setPincodeInput(e.target.value.replace(/\D/g, ''));
            setFormatError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCheck();
          }}
          aria-label="Delivery pincode"
        />
        <button type="button" onClick={handleCheck} className="btn-primary shrink-0">
          Check
        </button>
      </div>
      {formatError && (
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-red-600">
          <IconAlertCircle className="h-3.5 w-3.5" /> {formatError}
        </p>
      )}

      <div className="relative mt-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm focus:outline-none"
            placeholder="or search your area (e.g. Salt Lake)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Search your area"
          />
        </div>
        {areaSuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-lg">
            {areaSuggestions.map((row) => (
              <li key={row.pincode}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setPincode(row.pincode, pincodeOptionLabel(row))}
                >
                  {pincodeOptionLabel(row)} · {row.cityName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={handleGps} className="btn-secondary inline-flex items-center gap-1.5">
          <IconMapPin className="h-4 w-4" /> Use my current location
        </button>
        <Link href="/dashboard/addresses" className="text-sm font-semibold text-blue-600 hover:underline">
          Add full address
        </Link>
      </div>
      {gpsError && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-red-600">
          <IconAlertCircle className="h-3.5 w-3.5" /> {gpsError}
        </p>
      )}
    </section>
  );
}
