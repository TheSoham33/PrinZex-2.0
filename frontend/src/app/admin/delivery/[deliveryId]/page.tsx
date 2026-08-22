'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryBoyById } from '@/lib/api/admin-delivery';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconAlertCircle, IconArrowLeft, IconStar } from '@/components/icons';

export default function AdminDeliveryDetailPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>;
}) {
  const { deliveryId } = use(params);
  const { data: rider, isLoading, isError } = useQuery({
    queryKey: ['admin-delivery', deliveryId],
    queryFn: () => fetchDeliveryBoyById(deliveryId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="card h-64 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (isError || !rider) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Partner not found</h1>
          <p className="mt-1 text-sm text-slate-600">
            No delivery partner matches <span className="font-mono">{deliveryId}</span>.
          </p>
          <Link href="/admin/delivery" className="btn-primary mt-6">
            <IconArrowLeft className="h-4 w-4" /> Back to delivery partners
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/delivery" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <IconArrowLeft className="h-4 w-4" /> All delivery partners
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{rider.name}</h1>
            <StatusBadge status={rider.status} size="md" />
            <StatusBadge status={rider.verified ? 'verified' : 'needs_review'} label={rider.verified ? 'Verified' : 'Unverified'} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{rider.id}</span> · {rider.vehicleType} · {rider.city}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Contact & vehicle</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{rider.phone}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="break-all text-right text-slate-900">{rider.email}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Registration</dt><dd className="font-mono text-slate-900">{rider.vehicleRegistration}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Insurance expiry</dt><dd className="text-slate-900">{rider.insuranceExpiry === '—' ? '—' : formatDate(rider.insuranceExpiry)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(rider.joinedAt)}</dd></div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Performance</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Total deliveries</dt><dd className="font-bold text-slate-900">{rider.totalDeliveries}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Rating</dt><dd className="inline-flex items-center gap-1 font-bold text-slate-900"><IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(rider.rating).toFixed(1)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Total earnings</dt><dd className="font-bold text-slate-900">{formatCurrency(rider.totalEarnings)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Zones</dt><dd className="text-right text-slate-900">{rider.zones.join(', ') || '—'}</dd></div>
          </dl>
        </section>

        <section className="card p-5 sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Documents</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {rider.documents.map((d: any) => (
              <div key={d.type} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{d.label}</p>
                  <p className="truncate text-xs text-slate-500">{d.fileName}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 sm:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Recent deliveries</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {rider.recentDeliveries.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">No recent deliveries.</p>
            ) : (
              rider.recentDeliveries.map((d: any) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <Link href={`/admin/orders/${d.orderId}`} className="font-mono text-blue-600 hover:underline">{d.orderId}</Link>
                  <span className="text-slate-600">{d.customer}</span>
                  <span className="text-slate-500">{formatDateTime(d.deliveredAt)}</span>
                  <span className="font-medium text-green-700">+{formatCurrency(d.earning)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
