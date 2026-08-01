import type { StoreDetail } from '@/lib/mock-data/stores';
import { IconMailCheck, IconMapPin, IconPhone } from '@/components/icons';

export default function AboutSection({ store }: { store: StoreDetail }) {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      <p className="leading-relaxed text-slate-600">{store.description}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <IconMapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-medium text-slate-500">Address</p>
            <p className="mt-0.5 text-sm text-slate-900">{store.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <IconPhone className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-medium text-slate-500">Phone</p>
            <a href={`tel:${store.phone}`} className="mt-0.5 block text-sm text-blue-600 hover:underline">
              {store.phone}
            </a>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
          <IconMailCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-medium text-slate-500">Email</p>
            <a
              href={`mailto:${store.email}`}
              className="mt-0.5 block break-all text-sm text-blue-600 hover:underline"
            >
              {store.email}
            </a>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Opening hours</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {store.hours.map((entry) => {
                const isToday = entry.day === todayName;
                return (
                  <tr key={entry.day} className={isToday ? 'bg-blue-50/50' : ''}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {entry.day}
                      {isToday && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                          Today
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {entry.closed ? (
                        <span className="font-medium text-red-600">Closed</span>
                      ) : (
                        `${entry.open} – ${entry.close}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
