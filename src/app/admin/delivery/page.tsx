'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryBoys } from '@/lib/api/admin-delivery';
import { DELIVERY_ZONES, type DeliveryBoy } from '@/lib/types/admin-delivery';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconCheckCircle, IconStar } from '@/components/icons';

export default function AdminDeliveryPage() {
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-delivery'],
    queryFn: fetchDeliveryBoys,
  });

  const [riders, setRiders] = useState<DeliveryBoy[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawer, setDrawer] = useState<DeliveryBoy | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<DeliveryBoy | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<DeliveryBoy | null>(null);

  useEffect(() => {
    if (data) setRiders(data);
  }, [data]);

  const filtered = useMemo(
    () => riders.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [riders, statusFilter],
  );

  // Keep the open drawer in sync when the underlying record changes.
  const current = drawer ? riders.find((r) => r.id === drawer.id) ?? drawer : null;

  const toggleZone = (id: string, zone: string) => {
    setRiders((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, zones: r.zones.includes(zone) ? r.zones.filter((z) => z !== zone) : [...r.zones, zone] }
          : r,
      ),
    );
  };

  const columns: DataTableColumn<DeliveryBoy>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{r.name}</p>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City', sortable: true },
    { key: 'vehicleType', label: 'Vehicle', sortable: true },
    { key: 'totalDeliveries', label: 'Deliveries', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1 font-medium text-slate-900">
        <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}
      </span>
    ) },
    { key: 'totalEarnings', label: 'Earnings', sortable: true, render: (r) => formatCurrency(r.totalEarnings) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'verified', label: 'Verified', sortable: true, render: (r) => (
      <StatusBadge status={r.verified ? 'verified' : 'needs_review'} label={r.verified ? 'Yes' : 'No'} />
    ) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setDrawer(r)} className="btn-secondary text-xs">View</button>
          {!r.verified && (
            <button type="button" onClick={() => setVerifyTarget(r)} className="btn-secondary text-xs text-green-700">
              <IconCheckCircle className="h-3.5 w-3.5" /> Verify
            </button>
          )}
          {r.status !== 'suspended' && (
            <button type="button" onClick={() => setSuspendTarget(r)} className="btn-secondary text-xs text-red-600">
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Delivery partners</h1>
        <p className="mt-1 text-sm text-slate-600">
          {riders.length} partners · {riders.filter((r) => !r.verified).length} awaiting verification.
        </p>
      </header>

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by name or phone"
        caption="Delivery partners registered on the platform"
        pagination={{ pageSize: 8 }}
        emptyMessage="No delivery partners match these filters."
        filters={
          <div>
            <label htmlFor="dlv-status" className="label text-xs">Status</label>
            <select id="dlv-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        }
      />

      <ConfirmModal
        open={Boolean(verifyTarget)}
        title="Verify this partner?"
        message={`${verifyTarget?.name ?? ''} will be marked as verified and can be assigned deliveries.`}
        confirmLabel="Verify partner"
        onCancel={() => setVerifyTarget(null)}
        onConfirm={() => {
          if (verifyTarget) {
            setRiders((prev) => prev.map((r) => (r.id === verifyTarget.id ? { ...r, verified: true } : r)));
            showToast(`${verifyTarget.name} verified`);
          }
          setVerifyTarget(null);
        }}
      />

      <ConfirmModal
        open={Boolean(suspendTarget)}
        title="Suspend this partner?"
        message={`${suspendTarget?.name ?? ''} will stop receiving delivery assignments immediately.`}
        confirmLabel="Suspend partner"
        destructive
        onCancel={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) {
            setRiders((prev) => prev.map((r) => (r.id === suspendTarget.id ? { ...r, status: 'suspended' } : r)));
            showToast(`${suspendTarget.name} suspended`);
          }
          setSuspendTarget(null);
        }}
      />

      <UserDetailDrawer
        open={Boolean(current)}
        onClose={() => setDrawer(null)}
        title={current?.name ?? ''}
        subtitle={current ? `${current.vehicleType} · ${current.city}` : undefined}
        ariaLabel={`Details for delivery partner ${current?.name ?? ''}`}
      >
        {current && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Personal</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Partner ID</dt><dd className="font-mono text-slate-900">{current.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{current.phone}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="break-all text-right text-slate-900">{current.email}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(current.joinedAt)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Vehicle</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="text-slate-900">{current.vehicleType}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Registration</dt><dd className="font-mono text-slate-900">{current.vehicleRegistration}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Insurance expiry</dt><dd className="text-slate-900">{current.insuranceExpiry === '—' ? '—' : formatDate(current.insuranceExpiry)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Bank (masked)</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Account</dt><dd className="font-mono text-slate-900">{current.bankAccount}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">IFSC</dt><dd className="font-mono text-slate-900">{current.ifsc}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Documents</h3>
              <div className="mt-2 space-y-2">
                {current.documents.map((d) => (
                  <div key={d.type} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{d.label}</p>
                      <p className="truncate text-xs text-slate-500">{d.fileName}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Performance</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total deliveries</dt><dd className="font-bold text-slate-900">{current.totalDeliveries}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Rating</dt><dd className="font-bold text-slate-900">{current.rating.toFixed(1)} ★</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total earnings</dt><dd className="font-bold text-slate-900">{formatCurrency(current.totalEarnings)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Assign to zones</h3>
              <div className="mt-2 space-y-1.5">
                {DELIVERY_ZONES.map((zone) => (
                  <label key={zone} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={current.zones.includes(zone)}
                      onChange={() => toggleZone(current.id, zone)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                    />
                    {zone}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent deliveries</h3>
              <div className="mt-2 space-y-2">
                {current.recentDeliveries.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent deliveries.</p>
                ) : (
                  current.recentDeliveries.slice(0, 5).map((d) => (
                    <div key={d.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-slate-700">{d.orderId}</span>
                        <span className="font-medium text-green-700">+{formatCurrency(d.earning)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{d.customer} · {formatDateTime(d.deliveredAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}
