import type { ComponentType, ReactNode } from 'react';
import { IconAlertCircle } from '@/components/icons';

/**
 * UI helper page — small shared primitives that were copy-pasted across the
 * app. Keep them dumb: no data fetching, no routing decisions.
 */

type IconComponent = ComponentType<{ className?: string }>;

/**
 * Inline error strip. Renders nothing when `message` is empty, so call sites
 * stay one line: <ErrorNote message={error} />.
 *
 * Two near-identical class strings (px-4 py-3 red-700 / p-3 red-600) were
 * unified on the roomier variant — same look, one source.
 */
export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      <IconAlertCircle className="h-4 w-4 shrink-0" /> {message}
    </p>
  );
}

/**
 * Full-width state card (empty lists, load failures). Two tones: 'empty'
 * (slate icon bubble) and 'error' (red bubble, page-level h1 title).
 * `action` keeps its own layout classes (e.g. `btn-primary mt-6`).
 */
export function StateCard({
  icon: Icon,
  tone = 'empty',
  title,
  subtitle,
  action,
}: {
  icon: IconComponent;
  tone?: 'empty' | 'error';
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  const isError = tone === 'error';
  const Title = isError ? 'h1' : 'p';
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          isError ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon className="h-7 w-7" />
      </span>
      <Title className={isError ? 'mt-4 text-lg font-bold text-slate-900' : 'mt-4 font-semibold text-slate-900'}>
        {title}
      </Title>
      {subtitle ? <p className="mt-1 max-w-sm text-sm text-slate-600">{subtitle}</p> : null}
      {action ?? null}
    </div>
  );
}
