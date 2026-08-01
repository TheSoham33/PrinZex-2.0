'use client';

import Link from 'next/link';
import type { PlatformActivity } from '@/lib/mock-data/admin-analytics';
import { timeAgo } from '@/lib/utils';
import {
  IconHeadphones,
  IconPackage,
  IconStore,
  IconUser,
  IconWallet,
} from '@/components/icons';

const KIND_META = {
  seller: { icon: IconStore, className: 'bg-violet-50 text-violet-600' },
  order: { icon: IconPackage, className: 'bg-blue-50 text-blue-600' },
  ticket: { icon: IconHeadphones, className: 'bg-amber-50 text-amber-600' },
  payout: { icon: IconWallet, className: 'bg-green-50 text-green-600' },
  user: { icon: IconUser, className: 'bg-slate-100 text-slate-600' },
} as const;

export default function ActivityFeedItem({ activity }: { activity: PlatformActivity }) {
  const meta = KIND_META[activity.kind];
  const Icon = meta.icon;

  return (
    <Link
      href={activity.href}
      className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.className}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{activity.message}</p>
        <p className="mt-0.5 text-xs text-slate-400">{timeAgo(activity.timestamp)}</p>
      </div>
    </Link>
  );
}
