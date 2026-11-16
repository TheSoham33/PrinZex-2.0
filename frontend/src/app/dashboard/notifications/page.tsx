'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/utils';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from '@/lib/api/customer';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  IconBell,
  IconCheckCircle,
  IconPackage,
  IconTag,
  IconTruck,
  IconWallet,
} from '@/components/icons';

type NotificationKind = 'order' | 'delivery' | 'offer' | 'wallet';

const ICONS: Record<NotificationKind, { icon: typeof IconBell; color: string }> = {
  order: { icon: IconPackage, color: 'bg-blue-50 text-blue-600' },
  delivery: { icon: IconTruck, color: 'bg-orange-50 text-orange-600' },
  offer: { icon: IconTag, color: 'bg-amber-50 text-amber-600' },
  wallet: { icon: IconWallet, color: 'bg-violet-50 text-violet-600' },
};

/** Map backend notification types onto the four visual kinds. */
function kindOf(type: string): NotificationKind {
  if (type.startsWith('delivery')) return 'delivery';
  if (type.startsWith('promo')) return 'offer';
  if (type.startsWith('wallet') || type.startsWith('payout') || type.startsWith('cashback')) {
    return 'wallet';
  }
  return 'order';
}

function hrefOf(notification: ApiNotification): string | undefined {
  const data = notification.data ?? {};
  if (typeof data.href === 'string') return data.href;
  if (typeof data.orderId === 'string') return `/dashboard/orders/${data.orderId}`;
  return undefined;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => fetchNotifications({ page, limit: 20 }),
  });

  const items: ApiNotification[] = Array.isArray(data?.notifications?.data)
    ? data.notifications.data
    : [];
  const unreadCount: number = data?.unreadCount ?? 0;
  const totalPages: number = data?.notifications?.pagination?.totalPages ?? 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      invalidate();
      showToast('All notifications marked as read');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const readOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
    onError: (err: any) => showToast(err.message, 'error'),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? 'Loading…' : `${unreadCount} unread updates`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => readAllMutation.mutate()}
          disabled={readAllMutation.isPending || unreadCount === 0}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <IconCheckCircle className="h-4 w-4" /> Mark all read
        </button>
      </header>

      <div className="card mt-6 divide-y divide-slate-100">
        {isLoading && (
          <p className="p-6 text-center text-sm text-slate-500">Loading notifications…</p>
        )}
        {!isLoading && isError && (
          <p className="p-6 text-center text-sm text-red-600">
            Failed to load notifications. Please try again.
          </p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <IconBell className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-900">No notifications yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Updates about your orders will appear here in real time.
            </p>
          </div>
        )}
        {!isLoading &&
          items.map((notification) => {
            const kind = kindOf(notification.type);
            const meta = ICONS[kind];
            const href = hrefOf(notification);
            return (
              <button
                key={notification._id}
                type="button"
                onClick={() => {
                  if (!notification.isRead) readOneMutation.mutate(notification._id);
                }}
                className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-slate-50"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                >
                  <meta.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{notification.title}</span>
                    {!notification.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">{notification.body}</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {formatDateTime(notification.createdAt)}
                  </span>
                  {href && (
                    <Link
                      href={href}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View details
                    </Link>
                  )}
                </span>
              </button>
            );
          })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Newer
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Older
          </button>
        </div>
      )}
    </div>
  );
}
