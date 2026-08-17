'use client';

import type { FormEvent } from 'react';
import { IconMapPin, IconSearch } from '@/components/icons';

interface StoreSearchBarProps {
  location: string;
  query: string;
  onLocationChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
}

export default function StoreSearchBar({
  location,
  query,
  onLocationChange,
  onQueryChange,
  onSubmit,
}: StoreSearchBarProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 px-3 py-2 sm:border-r sm:border-slate-200">
        <IconMapPin className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Location"
          aria-label="Location"
          className="w-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      <div className="flex flex-1 items-center gap-2 px-3 py-2">
        <IconSearch className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search shops or services"
          aria-label="Search"
          className="w-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      <button type="submit" className="btn-primary sm:px-6">
        Search
      </button>
    </form>
  );
}
