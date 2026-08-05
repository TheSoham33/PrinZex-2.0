import { IconStar } from '@/components/icons';

interface ReviewsSummaryProps {
  rating: number;
  reviewCount: number;
  breakdown: Record<number, number>;
}

export default function ReviewsSummary({ rating, reviewCount, breakdown }: ReviewsSummaryProps) {
  return (
    <div className="flex flex-col gap-6 rounded-xl bg-slate-50 p-5 sm:flex-row sm:items-center">
      <div className="text-center sm:w-40 sm:shrink-0">
        <p className="text-4xl font-extrabold text-slate-900">{rating.toFixed(1)}</p>
        <div className="mt-1.5 flex items-center justify-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <IconStar
              key={index}
              className={`h-4 w-4 ${
                index < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
              }`}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">{reviewCount} reviews</p>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-3">
            <span className="w-6 text-xs font-medium text-slate-600">{star}★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${breakdown[star] ?? 0}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs text-slate-500">{breakdown[star] ?? 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
