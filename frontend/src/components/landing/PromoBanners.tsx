'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicBanners } from '@/lib/api/admin-content';

const SLIDE_MS = 5000;

/**
 * Homepage promo carousel — the banners an admin manages in
 * Admin → Content, active ones only (the public API filters), shown in the
 * admin's order. Auto-rotates every 5s; clicking a banner advances to the
 * next one, and the dots jump to a slide. Renders nothing when there are
 * no active banners (skeleton while the first fetch is in flight).
 */
export default function PromoBanners() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-banners'],
    queryFn: fetchPublicBanners,
    staleTime: 60_000,
  });
  const banners = [...(data ?? [])]
    .filter((banner) => banner.isActive)
    .sort((a, b) => a.order - b.order);
  const count = banners.length;
  const [index, setIndex] = useState(0);
  /** Banners whose imageUrl failed to load (dead host / bad link) — they
   *  render as a gradient + title card instead of a broken image. */
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (isLoading) {
    return (
      <section aria-hidden className="py-6 sm:py-8">
        <div className="container-page">
          <div className="aspect-[6/1] min-h-[64px] animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }
  if (isError || count === 0) return null;

  // In case a banner was deleted between fetches and the index now overruns.
  const active = Math.min(index, count - 1);

  return (
    <section className="py-6 sm:py-8" aria-label="Current offers" aria-roledescription="carousel">
      <div className="container-page">
        <div className="relative aspect-[6/1] min-h-[64px] overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
          {banners.map((banner, slideIndex) => {
            const isCurrent = slideIndex === active;
            const visibility = isCurrent
              ? 'opacity-100'
              : 'pointer-events-none opacity-0';
            const imageFailed = !banner.imageUrl || failedIds[banner.id] === true;
            const slide = imageFailed ? (
              /* Image missing or refused to load — fall back to a branded
                 gradient + title card (matches the admin preview's look),
                 so a bad URL can never leave a broken image on the
                 homepage. */
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-6">
                <span className="max-w-2xl text-center text-lg font-bold text-white sm:text-2xl">
                  {banner.title}
                </span>
              </div>
            ) : (
              <>
                {/* unoptimized: admins paste arbitrary hosted image URLs, so
                    the next/image domain allowlist cannot know them */}
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  sizes="100vw"
                  unoptimized
                  priority={slideIndex === 0}
                  onError={() =>
                    setFailedIds((prev) => ({ ...prev, [banner.id]: true }))
                  }
                  className="object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {banner.title}
                </span>
              </>
            );
            // The whole slide is a button: clicking a banner advances to the
            // next one (wrapping). Admin's Link URL stays stored but clicks
            // no longer navigate — rotation is the banner's interaction.
            return (
              <button
                key={banner.id}
                type="button"
                onClick={() => setIndex((active + 1) % count)}
                className={`absolute inset-0 block cursor-pointer transition-opacity duration-500 ${visibility}`}
                aria-hidden={!isCurrent}
                tabIndex={isCurrent ? 0 : -1}
                aria-label={
                  count > 1
                    ? `Banner ${active + 1} of ${count}: ${banner.title} — activate to see the next banner`
                    : banner.title
                }
              >
                {slide}
              </button>
            );
          })}

          {count > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              {banners.map((banner, dotIndex) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Show banner ${dotIndex + 1} of ${count}: ${banner.title}`}
                  aria-pressed={dotIndex === active}
                  className={`h-2 rounded-full transition-all ${
                    dotIndex === active ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
