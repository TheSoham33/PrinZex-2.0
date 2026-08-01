export default function StoreCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-32 animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-14 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-14 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
