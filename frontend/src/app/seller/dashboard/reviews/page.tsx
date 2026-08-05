'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerReviews } from '@/lib/api/seller-inventory';
import type { SellerReview } from '@/lib/mock-data/seller-inventory';
import ReviewResponseCard from '@/components/seller-dashboard/ReviewResponseCard';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconRefreshCw, IconStar } from '@/components/icons';

const FILTERS = ['All', 'Unanswered', '5★', '4★', '3★ and below'] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(review: SellerReview, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Unanswered') return review.reply === null;
  if (filter === '5★') return review.rating === 5;
  if (filter === '4★') return review.rating === 4;
  return review.rating <= 3;
}

export default function SellerReviewsPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-reviews'],
    queryFn: fetchSellerReviews,
  });

  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [filter, setFilter] = useState<Filter>('All');

  useEffect(() => {
    if (data) setReviews(data);
  }, [data]);

  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { average: 0, total: 0, breakdown: {} as Record<number, number> };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const breakdown: Record<number, number> = {};
    for (let star = 5; star >= 1; star -= 1) {
      const count = reviews.filter((review) => review.rating === star).length;
      breakdown[star] = Math.round((count / total) * 100);
    }
    return { average: sum / total, total, breakdown };
  }, [reviews]);

  const visible = reviews.filter((review) => matchesFilter(review, filter));

  const handleReply = (reviewId: string, reply: string) => {
    setReviews((previous) =>
      previous.map((review) => (review.id === reviewId ? { ...review, reply } : review)),
    );
    showToast('Reply posted');
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load reviews</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Respond to customers — replies show publicly on your store page.
        </p>
      </header>

      {isLoading ? (
        <div className="card mt-6 h-40 animate-pulse bg-slate-100" />
      ) : (
        <div className="card mt-6 flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
          <div className="text-center sm:w-40 sm:shrink-0">
            <p className="text-4xl font-extrabold text-slate-900">{stats.average.toFixed(1)}</p>
            <div className="mt-1.5 flex items-center justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <IconStar
                  key={index}
                  className={`h-4 w-4 ${
                    index < Math.round(stats.average)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{stats.total} reviews</p>
          </div>

          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <span className="w-6 text-xs font-medium text-slate-600">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${stats.breakdown[star] ?? 0}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs text-slate-500">
                  {stats.breakdown[star] ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Filter reviews"
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
      >
        {FILTERS.map((item) => {
          const count = reviews.filter((review) => matchesFilter(review, item)).length;
          const selected = filter === item;
          return (
            <button
              key={item}
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(item)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item}
              {!isLoading && (
                <span className="ml-1 text-xs font-normal text-slate-400">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card h-44 animate-pulse bg-slate-100" />
          ))
        ) : visible.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <IconStar className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No reviews in this filter</p>
            <p className="mt-1 text-sm text-slate-600">Try a different rating filter.</p>
          </div>
        ) : (
          visible.map((review) => (
            <ReviewResponseCard key={review.id} review={review} onReply={handleReply} />
          ))
        )}
      </div>
    </div>
  );
}
