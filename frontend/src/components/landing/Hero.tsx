'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { IconMapPin, IconSearch } from '@/components/icons';

export default function Hero() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (query.trim()) params.set('q', query.trim());
    router.push(`/stores${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="container-page relative py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-50 ring-1 ring-inset ring-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Now live across Kolkata
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your neighbourhood print shop,
            <span className="block text-blue-200">now online</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
            Upload your files, compare nearby shops on price and rating, and get your prints
            delivered — or pick them up in as little as two hours.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 sm:border-r sm:border-slate-200">
              <IconMapPin className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Salt Lake, Kolkata"
                aria-label="Location"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5">
              <IconSearch className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What do you need printed?"
                aria-label="Service"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <button type="submit" className="btn-primary shrink-0 px-6 py-3">
              Find shops
            </button>
          </form>

          <p className="mt-4 text-sm text-blue-200">
            Popular: Thesis binding · Visiting cards · Flex banners · Colour xerox
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="#services"
              className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
            >
              Browse All Services
            </Link>
            <Link
              href="/stores"
              className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
            >
              Browse All Shops
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
