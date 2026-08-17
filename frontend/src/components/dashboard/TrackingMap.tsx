'use client';

import { useEffect, useState } from 'react';
import type { DeliveryBoy } from '@/lib/mock-data/orders';
import { IconMapPin, IconStore, IconTruck } from '@/components/icons';

/**
 * Placeholder map. Real integration (Mapbox/Google Maps) would replace the
 * decorative grid with a live tile layer and a marker driven by `deliveryBoy`.
 */
export default function TrackingMap({ deliveryBoy }: { deliveryBoy?: DeliveryBoy }) {
  const [progress, setProgress] = useState(0.35);

  // Nudge the courier marker along the route so the mock feels alive.
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((value) => (value >= 0.85 ? 0.35 : value + 0.02));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden
      />

      {/* Decorative "roads" */}
      <div className="absolute left-0 right-0 top-1/3 h-3 bg-slate-200" aria-hidden />
      <div className="absolute bottom-0 left-1/4 top-0 w-3 bg-slate-200" aria-hidden />

      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M 12% 78% Q 40% 70%, 50% 33% T 88% 22%"
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeDasharray="8 6"
          opacity="0.7"
        />
      </svg>

      {/* Store origin */}
      <div className="absolute bottom-[18%] left-[8%] flex flex-col items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg">
          <IconStore className="h-4 w-4" />
        </span>
        <span className="mt-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow">
          Shop
        </span>
      </div>

      {/* Destination */}
      <div className="absolute right-[8%] top-[14%] flex flex-col items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white shadow-lg">
          <IconMapPin className="h-4 w-4" />
        </span>
        <span className="mt-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow">
          You
        </span>
      </div>

      {/* Courier marker */}
      <div
        className="absolute transition-all duration-1000 ease-linear"
        style={{ left: `${progress * 100}%`, top: `${72 - progress * 55}%` }}
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl ring-4 ring-blue-500/30">
          <IconTruck className="h-5 w-5" />
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/40" />
        </span>
      </div>

      {deliveryBoy && (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow backdrop-blur">
          Live location · {deliveryBoy.lat.toFixed(4)}, {deliveryBoy.lng.toFixed(4)} · updated just
          now
        </div>
      )}
    </div>
  );
}
