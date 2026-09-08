'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicBanners } from '@/lib/api/admin-content';

const SLIDE_MS = 5000;

/**
 * Homepage promo carousel — the banners an admin manages in
 * Admin → Content, active ones only (the public API filters), shown in the
 * admin's order. Auto-rotates; dots jump to a slide. Renders nothing when
 * there are no active banners (skeleton while the first fetch is in flight).
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
          <div className="aspect-[3/1] animate-pulse rounded-3xl bg-slate-100" />
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
        <div className="relative aspect-[3/1] overflow-hidden rounded-3xl bg-slate-100 shadow-sm">
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
                 homepage. The slide stays clickable. */
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-6">
                <span className="max-w-2xl text-center text-xl font-bold text-white sm:text-3xl">
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
                <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {banner.title}
                </span>
              </>
            );
            return banner.linkUrl ? (
              <Link
                key={banner.id}
                href={banner.linkUrl}
                className={`absolute inset-0 transition-opacity duration-500 ${visibility}`}
                aria-hidden={!isCurrent}
                tabIndex={isCurrent ? 0 : -1}
              >
                {slide}
              </Link>
            ) : (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-500 ${visibility}`}
                aria-hidden={!isCurrent}
              >
                {slide}
              </div>
            );
          })}

          {count > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5">
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
