import { IconPackageOpen } from '@/components/icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onClear?: () => void;
}

export default function EmptyState({
  title = 'No shops match your filters',
  description = 'Try widening your search radius, lowering the minimum rating, or clearing a few filters.',
  onClear,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <IconPackageOpen className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-600">{description}</p>
      {onClear && (
        <button type="button" onClick={onClear} className="btn-primary mt-6">
          Clear all filters
        </button>
      )}
    </div>
  );
}
