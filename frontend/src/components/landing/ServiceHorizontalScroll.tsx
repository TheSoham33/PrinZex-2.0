'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { IconArrowLeft, IconArrowRight } from '@/components/icons';
import { SERVICE_CATEGORIES } from '@/lib/seller-types';
import { DEFAULT_SERVICE_IMAGE, SERVICE_IMAGE_MAP } from '@/lib/domain/stores';


export default function ServiceHorizontalScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Flatten all services into a single array
  const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => 
    cat.services.map(s => ({
      id: s.id,
      name: s.name,
      image: SERVICE_IMAGE_MAP[s.id] || DEFAULT_SERVICE_IMAGE
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
