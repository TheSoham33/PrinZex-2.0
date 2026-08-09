'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { IconArrowLeft, IconArrowRight } from '@/components/icons';
import { SERVICE_CATEGORIES } from '@/lib/seller-types';

// Image mapping for all 34 services
const IMAGE_MAP: Record<string, string> = {
  'doc-bw-print': '/images/services/xerox.jpg',
  'doc-color-print': '/images/services/color-print.jpg',
  'doc-xerox': '/images/services/photocopy.jpg',
  'doc-scan': '/images/services/scanning.jpg',
  'doc-fax': '/images/services/scanning.jpg',
  'bulk-booklets': '/images/services/booklets.jpg',
  'bulk-brochures': '/images/services/brochures.jpg',
  'bulk-flyers': '/images/services/flyers.jpg',
  'bulk-question-papers': '/images/services/xerox.jpg',
  'stat-visiting-cards': '/images/services/business-cards.jpg',
  'stat-letterheads': '/images/services/color-print.jpg',
  'stat-envelopes': '/images/services/color-print.jpg',
  'stat-bill-books': '/images/services/xerox.jpg',
  'stat-id-cards': '/images/services/business-cards.jpg',
  'spec-photo-prints': '/images/services/passport-photo.jpg',
  'spec-canvas': '/images/services/posters.jpg',
  'spec-mugs': '/images/services/mugs.jpg',
  'spec-tshirts': '/images/services/tshirts.jpg',
  'spec-invitations': '/images/services/posters.jpg',
  'pack-stickers': '/images/services/stickers.jpg',
  'pack-labels': '/images/services/stickers.jpg',
  'pack-boxes': '/images/services/booklets.jpg',
  'pack-tags': '/images/services/stickers.jpg',
  'bind-spiral': '/images/services/binding.jpg',
  'bind-hard': '/images/services/binding.jpg',
  'bind-perfect': '/images/services/binding.jpg',
  'bind-lamination': '/images/services/lamination.jpg',
  'bind-cutting': '/images/services/xerox.jpg',
  'lf-flex-banner': '/images/services/banners.jpg',
  'lf-vinyl': '/images/services/vinyl.jpg',
  'lf-standee': '/images/services/standee.jpg',
  'lf-hoarding': '/images/services/banners.jpg',
  'lf-vehicle-wrap': '/images/services/vinyl.jpg',
  'cust-design': '/images/services/design.jpg',
  'cust-urgent': '/images/services/color-print.jpg',
  'cust-pickup': '/images/services/scanning.jpg',
};

export default function ServiceHorizontalScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Flatten all services into a single array
  const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => 
    cat.services.map(s => ({
      id: s.id,
      name: s.name,
      image: IMAGE_MAP[s.id] || '/images/services/xerox.jpg'
    }))
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 1.5 : scrollLeft + clientWidth / 1.5;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-white py-10">
      <div className="container-page">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              What&apos;s on your mind?
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="Scroll left"
            >
              <IconArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="Scroll right"
            >
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar mt-8 flex flex-col gap-6 overflow-x-auto scroll-smooth pb-4"
        >
          {/* 2-Row Horizontal Scroll Container */}
          <div className="grid grid-flow-col grid-rows-2 gap-x-8 gap-y-6 sm:gap-x-12">
            {ALL_SERVICES.map((service) => (
              <Link
                key={service.id}
                href={`/stores?q=${encodeURIComponent(service.name)}`}
                className="group flex w-24 shrink-0 flex-col items-center gap-2 transition-transform hover:scale-105 sm:w-28"
              >
                <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-100 bg-slate-50 shadow-sm sm:h-24 sm:w-24">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <span className="text-center text-xs font-bold leading-tight text-slate-700 group-hover:text-blue-600 sm:text-sm">
                  {service.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
