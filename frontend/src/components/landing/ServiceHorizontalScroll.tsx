'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { IconArrowLeft, IconArrowRight } from '@/components/icons';

const CATEGORIES = [
  { name: 'B&W Xerox', image: '/images/services/xerox.jpg', query: 'xerox' },
  { name: 'Colour Print', image: '/images/services/color-print.jpg', query: 'colour print' },
  { name: 'Thesis Binding', image: '/images/services/binding.jpg', query: 'binding' },
  { name: 'Business Cards', image: '/images/services/business-cards.jpg', query: 'business cards' },
  { name: 'Flex Banners', image: '/images/services/banners.jpg', query: 'banners' },
  { name: 'Passport Photos', image: '/images/services/passport-photo.jpg', query: 'passport' },
  { name: 'Lamination', image: '/images/services/lamination.jpg', query: 'lamination' },
  { name: 'Custom Stickers', image: '/images/services/stickers.jpg', query: 'stickers' },
  { name: 'Flyers', image: '/images/services/flyers.jpg', query: 'flyers' },
  { name: 'Posters', image: '/images/services/posters.jpg', query: 'posters' },
];

export default function ServiceHorizontalScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 1.5 : scrollLeft + clientWidth / 1.5;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-white py-12">
      <div className="container-page">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Popular print options
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="Scroll left"
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="Scroll right"
            >
              <IconArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar mt-8 flex gap-6 overflow-x-auto scroll-smooth pb-4 sm:gap-8"
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/stores?q=${encodeURIComponent(cat.query)}`}
              className="group flex shrink-0 flex-col items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="h-28 w-28 overflow-hidden rounded-full border border-slate-100 bg-slate-50 shadow-sm sm:h-36 sm:w-36">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <span className="text-center text-sm font-bold text-slate-700 group-hover:text-blue-600 sm:text-base">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
