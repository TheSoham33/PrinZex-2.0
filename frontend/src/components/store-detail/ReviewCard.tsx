import type { Review } from '@/lib/mock-data/stores';
import { formatDate } from '@/lib/utils';
import { IconStar } from '@/components/icons';

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="border-b border-slate-200 py-5 last:border-0">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {review.avatarInitials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{review.customerName}</h4>
            <time className="text-xs text-slate-500">{formatDate(review.date)}</time>
          </div>
          <div className="mt-1 flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <IconStar
                key={index}
                className={`h-3.5 w-3.5 ${
                  index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
        </div>
      </div>
    </article>
  );
}
