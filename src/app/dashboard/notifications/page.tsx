'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import {
  IconBell,
  IconCheckCircle,
  IconPackage,
  IconTag,
  IconTruck,
  IconWallet,
} from '@/components/icons';

type NotificationKind = 'order' | 'delivery' | 'offer' | 'wallet';

interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href?: string;
}

const ICONS: Record<NotificationKind, { icon: typeof IconBell; color: string }> = {
  order: { icon: IconPackage, color: 'bg-blue-50 text-blue-600' },
  delivery: { icon: IconTruck, color: 'bg-orange-50 text-orange-600' },
  offer: { icon: IconTag, color: 'bg-amber-50 text-amber-600' },
  wallet: { icon: IconWallet, color: 'bg-violet-50 text-violet-600' },
};

const INITIAL: AppNotification[] = [
  {
    id: 'n1',
    kind: 'delivery',
    title: 'Your order is out for delivery',
    body: 'ORD-7721 from Print Master Pro is on its way. Sujoy will reach you shortly.',
    timestamp: '2026-07-27T14:40:00+05:30',
    read: false,
    href: '/dashboard/tracking/ORD-7721',
  },
  {
    id: 'n2',
    kind: 'order',
    title: 'Order confirmed',
    body: 'Elite Press Studio accepted ORD-9901 — 400 premium business cards.',
    timestamp: '2026-07-27T10:51:00+05:30',
    read: false,
    href: '/dashboard/orders/ORD-9901',
  },
  {
    id: 'n3',
    kind: 'order',
    title: 'Printing started',
    body: 'Quick Copy Hub has started work on ORD-8812.',
    timestamp: '2026-07-27T09:44:00+05:30',
    read: true,
    href: '/dashboard/orders/ORD-8812',
  },
  {
    id: 'n4',
    kind: 'offer',
    title: 'WELCOME10 is waiting',
    body: 'Get 10% off your next order above ₹200. Expires 30 September.',
    timestamp: '2026-07-25T11:00:00+05:30',
    read: true,
    href: '/dashboard/wallet',
  },
  {
    id: 'n5',
    kind: 'wallet',
    title: 'Refund credited',
    body: '₹20 for the cancelled order ORD-0011 is back in your wallet.',
    timestamp: '2026-06-22T20:10:00+05:30',
    read: true,
    href: '/dashboard/wallet',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL);
  const unread = notifications.filter((item) => !item.read).length;

  const markAllRead = () =>
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));

  const markRead = (id: string) =>
    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            {unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You’re all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="btn-secondary text-sm">
            <IconCheckCircle className="h-4 w-4" /> Mark all read
          </button>
        )}
      </header>

      <div className="card mt-6 divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <IconBell className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No notifications</p>
            <p className="mt-1 text-sm text-slate-600">Order updates will appear here.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const { icon: Icon, color } = ICONS[item.kind];
            const content = (
              <div
                className={`flex gap-4 p-4 transition-colors sm:p-5 ${
                  item.read ? '' : 'bg-blue-50/40'
                } ${item.href ? 'hover:bg-slate-50' : ''}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{formatDateTime(item.timestamp)}</p>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} onClick={() => markRead(item.id)} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
