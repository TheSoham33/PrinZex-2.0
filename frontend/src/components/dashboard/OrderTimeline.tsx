import type { OrderTimelineEvent } from '@/lib/mock-data/orders';
import { formatDateTime } from '@/lib/utils';
import { IconCheckCircle, IconX } from '@/components/icons';

export default function OrderTimeline({ timeline }: { timeline: OrderTimelineEvent[] }) {
  return (
    <ol className="relative">
      {timeline.map((event, index) => {
        const done = Boolean(event.timestamp);
        const cancelled = event.status === 'cancelled';
        const last = index === timeline.length - 1;

        return (
          <li key={`${event.status}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${
                  done ? 'bg-blue-500' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${
                cancelled
                  ? 'bg-red-500 text-white'
                  : done
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-400'
              }`}
            >
              {cancelled ? (
                <IconX className="h-4 w-4" />
              ) : done ? (
                <IconCheckCircle className="h-4 w-4" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </span>

            <div className="min-w-0 pt-1">
              <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                {event.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {event.timestamp ? formatDateTime(event.timestamp) : 'Pending'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
