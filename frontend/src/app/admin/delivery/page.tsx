'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliveryBoys,
  updateDeliveryBoyStatus,
  fetchDeliveryBoyById,
  verifyDeliveryBoyDocument,
} from '@/lib/api/admin-delivery';
import {
  createPincode,
  fetchPincodeRegistry,
  pincodeOptionLabel,
  setRiderCoverage,
  updatePincode,
} from '@/lib/api/pincodes';
import { createCity, fetchAllCities, updateCity, type AdminCityRow } from '@/lib/api/cities';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconStar, IconRefreshCw } from '@/components/icons';

export default function AdminDeliveryPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const handleCloseDrawer = useCallback(() => setDrawerId(null), []);

  const { data: riders = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-delivery', statusFilter],
    queryFn: () => fetchDeliveryBoys({ status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase() }),
  });

  const { data: currentRider, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-delivery-detail', drawerId],
    queryFn: () => drawerId ? fetchDeliveryBoyById(drawerId) : null,
    enabled: !!drawerId,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      updateDeliveryBoyStatus(id, 'SUSPENDED', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery'] });
      showToast('Delivery partner suspended');
      setSuspendTarget(null);
      setSuspendReason('');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleCloseSuspendModal = useCallback(() => {
    setSuspendTarget(null);
    setSuspendReason('');
  }, []);

  // ── City registry: operational cities + optional per-city fee overrides ──
  const [newCityName, setNewCityName] = useState('');
  const { data: cities = [], refetch: refetchCities } = useQuery({
    queryKey: ['admin-cities'],
    queryFn: fetchAllCities,
  });

  const createCityMutation = useMutation({
    mutationFn: () => createCity(newCityName),
    onSuccess: (row) => {
      showToast(`City "${row.name}" added to the registry`);
      setNewCityName('');
      refetchCities();
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const toggleCityActive = useMutation({
    mutationFn: ({ slug, active }: { slug: string; active: boolean }) => updateCity(slug, { active }),
    onSuccess: () => refetchCities(),
    onError: (err: any) => showToast(err.message, 'error'),
  });

  // ── Pincode registry: single source of truth for delivery geography ──────
  const [newPincode, setNewPincode] = useState('');
  const [newCitySlug, setNewCitySlug] = useState('');
  const [newZone, setNewZone] = useState('');
  const [coverageDraft, setCoverageDraft] = useState<string[] | null>(null);

  const { data: registry = [], refetch: refetchRegistry } = useQuery({
    queryKey: ['pincode-registry'],
    queryFn: fetchPincodeRegistry,
  });

  // Pincode form city: pinned to the first registry city until the admin picks.
  const selectedCitySlug = newCitySlug || cities[0]?.slug || '';

  const createPincodeMutation = useMutation({
    mutationFn: () => createPincode({ pincode: newPincode, citySlug: selectedCitySlug, zoneLabel: newZone }),
    onSuccess: () => {
      showToast('Pincode added to the registry');
      setNewPincode('');
      setNewZone('');
      refetchRegistry();
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const toggleServiceable = useMutation({
    mutationFn: ({ pincode, serviceable }: { pincode: string; serviceable: boolean }) =>
      updatePincode(pincode, { serviceable }),
    onSuccess: () => refetchRegistry(),
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const renameZone = useMutation({
    mutationFn: ({ pincode, zoneLabel }: { pincode: string; zoneLabel: string }) =>
      updatePincode(pincode, { zoneLabel }),
    onSuccess: () => {
      showToast('Zone label updated');
      refetchRegistry();
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const saveCoverage = useMutation({
    mutationFn: () => setRiderCoverage(drawerId!, coverageDraft ?? []),
    onSuccess: () => {
      showToast('Rider coverage updated — matching is exact pincode from now on');
      setCoverageDraft(null);
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-detail', drawerId] });
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleConfirmSuspend = useCallback(() => {
    if (suspendTarget) {
      suspendMutation.mutate({ id: suspendTarget.id, reason: suspendReason });
    }
  }, [suspendTarget, suspendReason, suspendMutation]);

  const verifyMutation = useMutation({
    mutationFn: (docType: string) => verifyDeliveryBoyDocument(drawerId!, docType, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-detail', drawerId] });
      showToast('Document verified');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  // Pincodes currently shown in the drawer (draft while editing, else saved).
  const activeCoverageCodes: string[] =
    coverageDraft ?? (currentRider?.coverage ?? []).map((r: { pincode: string }) => r.pincode);

  const columns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{r.name}</p>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City', sortable: true },
    { key: 'vehicleType', label: 'Vehicle', sortable: true },
    { key: 'totalDeliveries', label: 'Deliveries', sortable: true, render: (r) => r.totalDeliveries || 0 },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1 font-medium text-slate-900">
        <IconStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(r.averageRating || r.rating || 0).toFixed(1)}
      </span>
    ) },
    { key: 'totalEarnings', label: 'Earnings', sortable: true, render: (r) => formatCurrency(r.totalEarnings || 0) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setDrawerId(r.id)} className="btn-secondary text-xs">View</button>
          {r.status.toLowerCase() !== 'suspended' && (
            <button 
              type="button" 
              onClick={() => { setSuspendTarget(r); setSuspendReason(''); }} 
              className="btn-secondary text-xs text-red-600"
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Delivery partners</h1>
          <p className="mt-1 text-sm text-slate-600">
            {riders.length} registered partners.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-sm"
        >
          <IconRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <DataTable
        data={riders}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by name or phone"
        caption="Delivery partners registered on the platform"
        pagination={{ pageSize: 10 }}
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

      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">City registry</h2>
        <p className="mt-1 text-xs text-slate-500">
          Operational cities, shown in the storefront city picker. Pincodes belong to a city; delivery
          fees and ETAs fall back to Settings → Platform unless a city carries its own overrides.
        </p>

        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createCityMutation.mutate();
          }}
        >
          <input
            className="input max-w-xs"
            placeholder="City name e.g. Howrah"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            aria-label="New city name"
          />
          <button type="submit" className="btn-primary" disabled={createCityMutation.isPending || !newCityName.trim()}>
            Add city
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3">Pincodes</th>
                <th className="py-2 pr-3">Overrides</th>
                <th className="py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((row) => (
                <CityRegistryRow key={row.slug} row={row} onChanged={refetchCities} onToggle={(active) => toggleCityActive.mutate({ slug: row.slug, active })} />
              ))}
              {cities.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-slate-500">No cities yet — add the first one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Pincode registry (delivery zones)</h2>
        <p className="mt-1 text-xs text-slate-500">
          The single source of truth for delivery geography. Stores and riders can only reference
          these pincodes; zone labels are display-only and never used for matching — matching is
          always an exact 6-digit pincode equality.
        </p>

        <form
          className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            createPincodeMutation.mutate();
          }}
        >
          <input
            className="input"
            placeholder="PIN e.g. 700106"
            value={newPincode}
            maxLength={6}
            onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ''))}
            aria-label="New pincode"
          />
          <select
            className="input"
            value={selectedCitySlug}
            onChange={(e) => setNewCitySlug(e.target.value)}
            aria-label="City"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
            {cities.length === 0 && <option value="">No cities yet</option>}
          </select>
          <input className="input" placeholder="Zone label e.g. New Town" value={newZone} onChange={(e) => setNewZone(e.target.value)} aria-label="Zone label" />
          <button type="submit" className="btn-primary" disabled={createPincodeMutation.isPending || !/^\d{6}$/.test(newPincode) || !newZone.trim() || !selectedCitySlug}>
            Add pincode
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Pincode</th>
                <th className="py-2 pr-3">Zone label</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Stores</th>
                <th className="py-2 pr-3">Riders</th>
                <th className="py-2">Serviceable</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((row) => (
                <tr key={row.pincode} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs font-medium text-slate-900">{row.pincode}</td>
                  <td className="py-2 pr-3">
                    <input
                      className="input py-1 text-xs"
                      defaultValue={row.zoneLabel}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== row.zoneLabel) renameZone.mutate({ pincode: row.pincode, zoneLabel: value });
                      }}
                      aria-label={`Zone label for ${row.pincode}`}
                    />
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{row.cityName}</td>
                  <td className="py-2 pr-3 text-slate-600">{row.stores}</td>
                  <td className="py-2 pr-3 text-slate-600">{row.riders}</td>
                  <td className="py-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={row.serviceable}
                        onChange={(e) => toggleServiceable.mutate({ pincode: row.pincode, serviceable: e.target.checked })}
                      />
                      {row.serviceable ? 'Yes' : 'No'}
                    </label>
                  </td>
                </tr>
              ))}
              {registry.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm text-slate-500">Registry is empty — add the first pincode above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(suspendTarget)}
        title="Suspend this partner?"
        message={`${suspendTarget?.name ?? ''} will stop receiving delivery assignments immediately.`}
        confirmLabel="Suspend partner"
        destructive
        onCancel={handleCloseSuspendModal}
        onConfirm={handleConfirmSuspend}
        loading={suspendMutation.isPending}
      >
        <div className="mt-4">
          <label htmlFor="suspend-reason" className="label">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="suspend-reason"
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Why is this rider being suspended?"
            className="input resize-none"
          />
        </div>
      </ConfirmModal>

      <UserDetailDrawer
        open={Boolean(drawerId)}
        onClose={handleCloseDrawer}
        title={currentRider?.name ?? 'Loading...'}
        subtitle={currentRider ? `${currentRider.vehicleType} · ${currentRider.city}` : undefined}
        ariaLabel="Rider details"
      >
        {loadingDetail ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        ) : currentRider && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Personal</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Partner ID</dt><dd className="font-mono text-slate-900">{currentRider.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{currentRider.phone}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="break-all text-right text-slate-900">{currentRider.email}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(currentRider.createdAt)}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Pincode coverage</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeCoverageCodes.map((code) => {
                  const label =
                    registry.find((r) => r.pincode === code)?.zoneLabel ??
                    (currentRider.coverage ?? []).find((r: { pincode: string }) => r.pincode === code)?.zoneLabel ??
                    'Zone';
                  return (
                    <span key={code} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {label} · {code}
                    </span>
                  );
                })}
                {activeCoverageCodes.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No coverage set — the rider is unrestricted until you assign registry pincodes.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="coverage-select">Assign coverage from the registry</label>
                <select
                  id="coverage-select"
                  className="input mt-1 py-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const code = e.target.value;
                    if (!code) return;
                    setCoverageDraft(
                      activeCoverageCodes.includes(code)
                        ? activeCoverageCodes.filter((p) => p !== code)
                        : [...activeCoverageCodes, code],
                    );
                  }}
                >
                  <option value="">Toggle a pincode…</option>
                  {registry
                    .filter((r) => r.serviceable)
                    .map((r) => (
                      <option key={r.pincode} value={r.pincode}>
                        {activeCoverageCodes.includes(r.pincode) ? '✓ ' : ''}{pincodeOptionLabel(r)}
                      </option>
                    ))}
                </select>
                {coverageDraft !== null && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-primary text-xs" disabled={saveCoverage.isPending} onClick={() => saveCoverage.mutate()}>
                      Save coverage
                    </button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => setCoverageDraft(null)}>
                      Discard
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Vehicle</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="text-slate-900 uppercase">{currentRider.vehicleType}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Registration</dt><dd className="font-mono text-slate-900">{currentRider.vehicleRegNo}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Documents</h3>
              <div className="mt-2 space-y-2">
                {currentRider.documents?.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 uppercase">{d.docType.replace(/_/g, ' ')}</p>
                      <div className="flex gap-2 mt-1">
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View file</a>
                        {!d.isVerified && (
                          <button 
                            onClick={() => verifyMutation.mutate(d.docType)}
                            disabled={verifyMutation.isPending}
                            className="text-xs text-green-600 hover:underline"
                          >
                            {verifyMutation.isPending ? '...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={d.isVerified ? 'verified' : 'needs_review'} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Performance</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total deliveries</dt><dd className="font-bold text-slate-900">{currentRider.totalDeliveries || 0}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Rating</dt><dd className="font-bold text-slate-900">{(currentRider.averageRating || 0).toFixed(1)} ★</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Total earnings</dt><dd className="font-bold text-slate-900">{formatCurrency(currentRider.totalEarnings || 0)}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}

const SPEED_LABELS: Array<{ key: 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP'; label: string }> = [
  { key: 'STANDARD', label: 'Standard' },
  { key: 'EXPRESS', label: 'Express' },
  { key: 'SAME_DAY', label: 'Same day' },
  { key: 'PICKUP', label: 'Pickup' },
];

/** One city row with active toggle + optional fee/ETA overrides (blank = inherit platform defaults). */
function CityRegistryRow({
  row,
  onChanged,
  onToggle,
}: {
  row: AdminCityRow;
  onChanged: () => void;
  onToggle: (active: boolean) => void;
}) {
  const { showToast } = useToast();
  const [fees, setFees] = useState<Record<string, string>>({});
  const [etas, setEtas] = useState<Record<string, string>>({});

  const hasFeeOverrides = row.deliveryFees != null && Object.keys(row.deliveryFees).length > 0;
  const hasEtaOverrides = row.deliveryEtaHours != null && Object.keys(row.deliveryEtaHours).length > 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      const deliveryFees: Record<string, number> = {};
      const deliveryEtaHours: Record<string, number> = {};
      for (const { key } of SPEED_LABELS) {
        const fee = fees[key];
        if (fee !== undefined && fee.trim() !== '' && Number(fee) >= 0) deliveryFees[key] = Number(fee);
        const eta = etas[key];
        if (eta !== undefined && eta.trim() !== '' && Number(eta) > 0) deliveryEtaHours[key] = Number(eta);
      }
      return updateCity(row.slug, {
        deliveryFees: Object.keys(deliveryFees).length > 0 ? deliveryFees : null,
        deliveryEtaHours: Object.keys(deliveryEtaHours).length > 0 ? deliveryEtaHours : null,
      });
    },
    onSuccess: () => {
      showToast(`Overrides saved for ${row.name}`);
      setFees({});
      setEtas({});
      onChanged();
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const clearMutation = useMutation({
    mutationFn: () => updateCity(row.slug, { deliveryFees: null, deliveryEtaHours: null }),
    onSuccess: () => {
      showToast(`${row.name} now uses platform defaults`);
      onChanged();
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 pr-3 font-medium text-slate-900">{row.name}</td>
      <td className="py-2 pr-3 font-mono text-xs text-slate-500">{row.slug}</td>
      <td className="py-2 pr-3 text-slate-600">{row.pincodes}</td>
      <td className="py-2 pr-3">
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-blue-600 hover:underline">
            {hasFeeOverrides || hasEtaOverrides ? 'Custom fees/ETAs set' : 'Using platform defaults'}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SPEED_LABELS.map(({ key, label }) => (
              <div key={key} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-700">{label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex-1 text-slate-500">
                    Fee ₹
                    <input
                      type="number"
                      min={0}
                      className="input mt-0.5 w-full py-1 text-xs"
                      placeholder={String(row.deliveryFees?.[key] ?? '')}
                      value={fees[key] ?? ''}
                      onChange={(e) => setFees((prev) => ({ ...prev, [key]: e.target.value }))}
                      aria-label={`${label} delivery fee override for ${row.name}`}
                    />
                  </label>
                  <label className="flex-1 text-slate-500">
                    ETA h
                    <input
                      type="number"
                      min={1}
                      className="input mt-0.5 w-full py-1 text-xs"
                      placeholder={String(row.deliveryEtaHours?.[key] ?? '')}
                      value={etas[key] ?? ''}
                      onChange={(e) => setEtas((prev) => ({ ...prev, [key]: e.target.value }))}
                      aria-label={`${label} ETA override for ${row.name}`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save overrides
            </button>
            {(hasFeeOverrides || hasEtaOverrides) && (
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
                Clear overrides
              </button>
            )}
          </div>
        </details>
      </td>
      <td className="py-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={row.active} onChange={(e) => onToggle(e.target.checked)} aria-label={`${row.name} active`} />
          {row.active ? 'Live in picker' : 'Hidden'}
        </label>
      </td>
    </tr>
  );
}
