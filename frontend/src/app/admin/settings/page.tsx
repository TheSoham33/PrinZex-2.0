'use client';

import { useEffect, useState, type FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminAccounts, 
  inviteAdmin, 
  updateAdminRole, 
  deactivateAdmin,
} from '@/lib/api/admin-admins';
import { fetchPlatformSettings, updatePlatformSettings } from '@/lib/api/admin-content';
import { fetchActivityLogs } from '@/lib/api/admin-logs';
import { fetchAdminAnalyticsKPI, fetchCommissions } from '@/lib/api/admin-payouts';
import {
  ROLE_BADGE_STYLES,
  ROLE_LABELS,
} from '@/store/slices/adminAuthSlice';
import { usePermission } from '../admin-context';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Modal from '@/components/seller-dashboard/Modal';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { formatDateTime, scrollToField } from '@/lib/utils';
import { FieldError } from '@/components/ui';
import { IconArrowLeft, IconPlus, IconShieldOff, IconRefreshCw } from '@/components/icons';

const TABS = ['Admin accounts', 'Commission', 'Platform', 'Activity log'] as const;
type Tab = (typeof TABS)[number];

const ROLE_OPTIONS = [
  'SUPER_ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT', 'FINANCE_MANAGER', 'CONTENT_MANAGER',
];

/** Delivery-speed rows for the Platform tab, keyed by the backend enum. */
const SPEED_ROWS = [
  { key: 'STANDARD', slug: 'standard', label: 'Standard' },
  { key: 'EXPRESS', slug: 'express', label: 'Express' },
  { key: 'SAME_DAY', slug: 'same-day', label: 'Same day' },
  { key: 'PICKUP', slug: 'pickup', label: 'Store pickup' },
] as const;
type SpeedRowKey = (typeof SPEED_ROWS)[number]['key'];

/**
 * Mirrors parseBoundedNumber in prinzex-backend/src/utils/platformSettings.ts.
 * Only drives under-field messages here — the backend re-validates the same
 * bounds (SETTING_BOUNDS) as the source of truth on every save.
 */
const withinBounds = (value: number, min: number, max: number, maxDecimals: number): boolean => {
  if (!Number.isFinite(value) || value < min || value > max) return false;
  const factor = 10 ** maxDecimals;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-9;
};

export default function AdminSettingsPage() {
  const canManageAdmins = usePermission('canManageAdmins');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const accountsQ = useQuery({ queryKey: ['admin-accounts'], queryFn: fetchAdminAccounts, enabled: canManageAdmins });
  const commissionsQ = useQuery({ queryKey: ['admin-commissions'], queryFn: fetchCommissions, enabled: canManageAdmins });
  const logQ = useQuery({ queryKey: ['admin-activity-log'], queryFn: () => fetchActivityLogs(), enabled: canManageAdmins });
  const settingsQ = useQuery({ queryKey: ['admin-platform-settings'], queryFn: fetchPlatformSettings, enabled: canManageAdmins });

  const [tab, setTab] = useState<Tab>('Admin accounts');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'SUPPORT_AGENT' });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);

  const [platform, setPlatform] = useState({
    name: 'PrinZex',
    supportEmail: 'support@prinzex.in',
    schedule: 'weekly' as 'weekly' | 'monthly',
    minPayout: 500,
    maintenance: false,
    maxUploadFileSizeMb: 100,
    platformFeeEnabled: false,
    platformFee: 0,
    platformFeeMax: 10000,
    platformFeeFromWallet: false,
    gstRatePercent: 18,
    deliveryFees: { STANDARD: 0, EXPRESS: 50, SAME_DAY: 120, PICKUP: 0 },
    deliveryEtaHours: { STANDARD: 48, EXPRESS: 12, SAME_DAY: 6, PICKUP: 4 },
    assignRadiusKm: 10,
    walletMaxCredit: 100000,
    walletMaxBatchSize: 500,
  });
  /** Under-field messages keyed by input id (site-wide rule). */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settingsQ.data) {
      // Merge over the defaults so a field missing from an older settings
      // document (e.g. maxUploadFileSizeMb pre-migration) keeps its default.
      setPlatform((prev) => ({ ...prev, ...settingsQ.data }));
    }
  }, [settingsQ.data]);

  const inviteMutation = useMutation({
    mutationFn: inviteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      showToast('Invitation sent');
      setInviteOpen(false);
      setInviteForm({ name: '', email: '', role: 'SUPPORT_AGENT' });
    },
    onError: (err: any) => setInviteError(err.message),
  });

  const saveSettingsM = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      showToast('Platform settings saved');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateAdminRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      showToast('Role updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      showToast('Admin access revoked');
      setRevokeTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleCloseInviteModal = useCallback(() => setInviteOpen(false), []);
  const handleCloseRevokeModal = useCallback(() => setRevokeTarget(null), []);

  const clearFieldError = (id: string) =>
    setFieldErrors((prev) => (prev[id] ? { ...prev, [id]: '' } : prev));

  const setSpeedValue = (field: 'deliveryFees' | 'deliveryEtaHours', key: SpeedRowKey, value: number) => {
    if (field === 'deliveryFees') {
      setPlatform((prev) => ({ ...prev, deliveryFees: { ...prev.deliveryFees, [key]: value } }));
    } else {
      setPlatform((prev) => ({ ...prev, deliveryEtaHours: { ...prev.deliveryEtaHours, [key]: value } }));
    }
  };

  const save = async (label: string) => {
    // Client-side sanity before the API — under-field messages and a scroll to
    // the first invalid field (site-wide rule). Bounds mirror SETTING_BOUNDS in
    // the backend, which re-validates everything as the source of truth.
    const errors: Record<string, string> = {};
    const feeMaxOk = withinBounds(platform.platformFeeMax, 1, 1_000_000, 2);
    const feeCeiling = feeMaxOk ? platform.platformFeeMax : 10_000;
    if (!withinBounds(platform.platformFee, 0, feeCeiling, 2)) {
      errors['p-platformfee'] = `Enter a fee between 0 and ${feeCeiling} (at most 2 decimals)`;
    }
    if (!feeMaxOk) {
      errors['p-platformfeemax'] = 'Enter a ceiling between 1 and 1,000,000 (at most 2 decimals)';
    }
    if (!withinBounds(platform.gstRatePercent, 0, 28, 2)) {
      errors['p-gst'] = 'Enter a GST rate between 0 and 28 (at most 2 decimals)';
    }
    for (const { key, slug, label: speedLabel } of SPEED_ROWS) {
      if (!withinBounds(platform.deliveryFees[key], 0, 10_000, 2)) {
        errors[`p-fee-${slug}`] = `${speedLabel}: charge between 0 and 10,000 (at most 2 decimals)`;
      }
      if (!withinBounds(platform.deliveryEtaHours[key], 1, 168, 0)) {
        errors[`p-eta-${slug}`] = `${speedLabel}: whole hours between 1 and 168`;
      }
    }
    if (!withinBounds(platform.assignRadiusKm, 1, 100, 1)) {
      errors['p-radius'] = 'Enter a radius between 1 and 100 km (at most 1 decimal)';
    }
    if (!withinBounds(platform.walletMaxCredit, 1, 10_000_000, 2)) {
      errors['p-walletmax'] = 'Enter a limit between 1 and 10,000,000 (at most 2 decimals)';
    }
    if (!withinBounds(platform.walletMaxBatchSize, 1, 2_000, 0)) {
      errors['p-walletbatch'] = 'Enter a whole number between 1 and 2,000';
    }
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      scrollToField(firstInvalid);
      return;
    }
    saveSettingsM.mutate(platform);
  };

  if (!canManageAdmins) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <IconShieldOff className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Platform settings are restricted to administrators with account-management permission.
        </p>
        <Link href="/admin/dashboard" className="btn-primary mt-6">
          <IconArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const accountColumns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div>
    ) },
    { key: 'role', label: 'Role', sortable: true, render: (r) => (
      <select
        value={r.role}
        disabled={roleMutation.isPending && roleMutation.variables?.id === r.id}
        onChange={(e) => roleMutation.mutate({ id: r.id, role: e.target.value })}
        className={`rounded-md border-0 px-2 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE_STYLES[r.role] || 'bg-slate-50'}`}
      >
        {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>)}
      </select>
    ) },
    { key: 'lastLoginAt', label: 'Last login', sortable: true, render: (r) => r.lastLoginAt ? formatDateTime(r.lastLoginAt) : <span className="text-slate-400">Never</span> },
    { key: 'isActive', label: 'Active', render: (r) => (
      <ToggleSwitch 
        checked={r.isActive} 
        disabled={true} // Deactivation is handled via Revoke button for safety
        label="Active" 
        hideLabel 
        onChange={() => {}} 
      />
    ) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <button 
        type="button" 
        onClick={() => setRevokeTarget(r)} 
        disabled={!r.isActive}
        className="btn-secondary text-xs text-red-600 disabled:opacity-30"
      >
        Revoke access
      </button>
    ) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Admin accounts, commission and platform configuration.</p>
        </div>
        <button
          onClick={() => { accountsQ.refetch(); commissionsQ.refetch(); logQ.refetch(); settingsQ.refetch(); }}
          className="btn-secondary text-sm"
        >
          <IconRefreshCw className={`h-4 w-4 ${(accountsQ.isFetching || commissionsQ.isFetching || logQ.isFetching || settingsQ.isFetching) ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Admin accounts' && (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setInviteOpen(true)} className="btn-primary"><IconPlus className="h-4 w-4" /> Invite admin</button>
          </div>
          <DataTable data={accountsQ.data || []} columns={accountColumns} isLoading={accountsQ.isLoading} searchable searchPlaceholder="Search admins" caption="Admin user accounts" emptyMessage="No admin accounts." />
        </>
      )}

      {tab === 'Commission' && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Commission by service category</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(commissionsQ.data || []).map((row: any) => (
              <div key={row.categoryId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="min-w-[10rem] flex-1 text-sm font-medium text-slate-900">{row.category}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{row.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Platform' && (
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); save('Platform settings'); }}
          className="card space-y-5 p-6"
        >
          <div>
            <label htmlFor="p-name" className="label">Platform name</label>
            <input id="p-name" type="text" value={platform.name} onChange={(e) => setPlatform({ ...platform, name: e.target.value })} className="input" />
          </div>

          <div>
            <label htmlFor="p-email" className="label">Support email</label>
            <input id="p-email" type="email" value={platform.supportEmail} onChange={(e) => setPlatform({ ...platform, supportEmail: e.target.value })} className="input" />
          </div>

          <fieldset>
            <legend className="label">Default payout schedule</legend>
            <div className="flex gap-4">
              {(['weekly', 'monthly'] as const).map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 text-sm capitalize text-slate-700">
                  <input
                    type="radio"
                    name="schedule"
                    checked={platform.schedule === option}
                    onChange={() => setPlatform({ ...platform, schedule: option })}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="p-min" className="label">Minimum payout threshold (₹)</label>
            <input id="p-min" type="number" min={0} value={platform.minPayout} onChange={(e) => setPlatform({ ...platform, minPayout: Number(e.target.value) })} className="input max-w-[12rem]" />
          </div>

          <div>
            <label htmlFor="p-maxupload" className="label">Max upload size (MB)</label>
            <input
              id="p-maxupload"
              type="number"
              min={1}
              max={128}
              value={platform.maxUploadFileSizeMb}
              onChange={(e) => setPlatform({ ...platform, maxUploadFileSizeMb: Number(e.target.value) })}
              className="input max-w-[12rem]"
              aria-describedby="p-maxupload-hint"
            />
            <p id="p-maxupload-hint" className="mt-1 text-xs text-slate-500">
              Applies to the file customers attach to an order (PDF, JPG/PNG, DOC/DOCX, PPT/PPTX).
              Whole MB, 1–128 — 128 is the converter sidecar&apos;s hard ceiling.
            </p>
          </div>

          <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="label px-1">Platform fee</legend>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                id="p-platformfee-enabled"
                type="checkbox"
                checked={platform.platformFeeEnabled}
                onChange={(e) => setPlatform({ ...platform, platformFeeEnabled: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              <span className="text-slate-700">
                <span className="font-semibold text-slate-900">Charge a platform fee on every order</span>
                <br />
                Master switch. Off = no fee is charged anywhere; the amount below is kept
                for when you switch it back on.
              </span>
            </label>
            <div>
              <label htmlFor="p-platformfee" className="label">Amount per order (₹)</label>
              <input
                id="p-platformfee"
                type="number"
                min={0}
                step="0.01"
                value={platform.platformFee}
                onChange={(e) => {
                  setPlatform({ ...platform, platformFee: Number(e.target.value) });
                  clearFieldError('p-platformfee');
                }}
                className={`input max-w-[12rem] ${fieldErrors['p-platformfee'] ? 'input-error' : ''}`}
                aria-describedby="p-platformfee-hint"
              />
              <p id="p-platformfee-hint" className="mt-1 text-xs text-slate-500">
                Charged on every order and shown as its own &quot;Platform fee&quot; line at payment —
                only while the switch above is ON.
              </p>
              <FieldError message={fieldErrors['p-platformfee'] || null} />
            </div>
            <div>
              <label htmlFor="p-platformfeemax" className="label">Maximum allowed fee (₹)</label>
              <input
                id="p-platformfeemax"
                type="number"
                min={1}
                max={1000000}
                step="0.01"
                value={platform.platformFeeMax}
                onChange={(e) => {
                  setPlatform({ ...platform, platformFeeMax: Number(e.target.value) });
                  clearFieldError('p-platformfeemax');
                }}
                className={`input max-w-[12rem] ${fieldErrors['p-platformfeemax'] ? 'input-error' : ''}`}
                aria-describedby="p-platformfeemax-hint"
              />
              <p id="p-platformfeemax-hint" className="mt-1 text-xs text-slate-500">
                Validation ceiling for the amount above — raise it here before charging
                a fee beyond ₹10,000. Guards against typos.
              </p>
              <FieldError message={fieldErrors['p-platformfeemax'] || null} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                id="p-platformfee-wallet"
                type="checkbox"
                checked={platform.platformFeeFromWallet}
                onChange={(e) => setPlatform({ ...platform, platformFeeFromWallet: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              <span className="text-slate-700">
                <span className="font-semibold text-slate-900">Allow platform fee from PrinZex Wallet</span>
                <br />
                Off (default): customers ALWAYS pay the fee online from real money — wallet
                credit can only cover the rest of the order. On: the wallet may settle the
                whole order including the fee.
              </span>
            </label>
          </fieldset>

          <div>
            <label htmlFor="p-gst" className="label">GST rate (%)</label>
            <input
              id="p-gst"
              type="number"
              min={0}
              max={28}
              step="0.01"
              value={platform.gstRatePercent}
              onChange={(e) => {
                setPlatform({ ...platform, gstRatePercent: Number(e.target.value) });
                clearFieldError('p-gst');
              }}
              className={`input max-w-[12rem] ${fieldErrors['p-gst'] ? 'input-error' : ''}`}
              aria-describedby="p-gst-hint"
            />
            <p id="p-gst-hint" className="mt-1 text-xs text-slate-500">
              Applied to the order subtotal in every quote and invoice — checkout renders
              it in the &quot;GST&quot; line. India slabs cap at 28.
            </p>
            <FieldError message={fieldErrors['p-gst'] || null} />
          </div>

          <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="label px-1">Delivery charge &amp; promise per speed</legend>
            <p className="text-xs text-slate-500">
              A charge of ₹0 shows as &quot;Free&quot; at checkout; the promise (in hours) becomes
              the speed tile&apos;s ETA label and the quoted delivery estimate.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SPEED_ROWS.map(({ key, slug, label: speedLabel }) => (
                <div key={key} className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`p-fee-${slug}`} className="label">{speedLabel} charge (₹)</label>
                    <input
                      id={`p-fee-${slug}`}
                      type="number"
                      min={0}
                      max={10000}
                      step="0.01"
                      value={platform.deliveryFees[key]}
                      onChange={(e) => {
                        setSpeedValue('deliveryFees', key, Number(e.target.value));
                        clearFieldError(`p-fee-${slug}`);
                      }}
                      className={`input ${fieldErrors[`p-fee-${slug}`] ? 'input-error' : ''}`}
                    />
                    <FieldError message={fieldErrors[`p-fee-${slug}`] || null} />
                  </div>
                  <div>
                    <label htmlFor={`p-eta-${slug}`} className="label">{speedLabel} promise (hours)</label>
                    <input
                      id={`p-eta-${slug}`}
                      type="number"
                      min={1}
                      max={168}
                      step={1}
                      value={platform.deliveryEtaHours[key]}
                      onChange={(e) => {
                        setSpeedValue('deliveryEtaHours', key, Number(e.target.value));
                        clearFieldError(`p-eta-${slug}`);
                      }}
                      className={`input ${fieldErrors[`p-eta-${slug}`] ? 'input-error' : ''}`}
                    />
                    <FieldError message={fieldErrors[`p-eta-${slug}`] || null} />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="p-radius" className="label">Auto-assign radius (km)</label>
            <input
              id="p-radius"
              type="number"
              min={1}
              max={100}
              step="0.1"
              value={platform.assignRadiusKm}
              onChange={(e) => {
                setPlatform({ ...platform, assignRadiusKm: Number(e.target.value) });
                clearFieldError('p-radius');
              }}
              className={`input max-w-[12rem] ${fieldErrors['p-radius'] ? 'input-error' : ''}`}
              aria-describedby="p-radius-hint"
            />
            <p id="p-radius-hint" className="mt-1 text-xs text-slate-500">
              How far from the store the system searches for an online delivery partner
              when auto-assigning a new delivery.
            </p>
            <FieldError message={fieldErrors['p-radius'] || null} />
          </div>

          <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="label px-1">Wallet credit limits</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-walletmax" className="label">Max credit per user (₹)</label>
                <input
                  id="p-walletmax"
                  type="number"
                  min={1}
                  max={10000000}
                  step="0.01"
                  value={platform.walletMaxCredit}
                  onChange={(e) => {
                    setPlatform({ ...platform, walletMaxCredit: Number(e.target.value) });
                    clearFieldError('p-walletmax');
                  }}
                  className={`input ${fieldErrors['p-walletmax'] ? 'input-error' : ''}`}
                  aria-describedby="p-wallet-hint"
                />
                <FieldError message={fieldErrors['p-walletmax'] || null} />
              </div>
              <div>
                <label htmlFor="p-walletbatch" className="label">Max users per bulk credit</label>
                <input
                  id="p-walletbatch"
                  type="number"
                  min={1}
                  max={2000}
                  step={1}
                  value={platform.walletMaxBatchSize}
                  onChange={(e) => {
                    setPlatform({ ...platform, walletMaxBatchSize: Number(e.target.value) });
                    clearFieldError('p-walletbatch');
                  }}
                  className={`input ${fieldErrors[`p-walletbatch`] ? 'input-error' : ''}`}
                  aria-describedby="p-wallet-hint"
                />
                <FieldError message={fieldErrors['p-walletbatch'] || null} />
              </div>
            </div>
            <p id="p-wallet-hint" className="text-xs text-slate-500">
              Enforced when an admin credits PrinZex Wallet balances (single or bulk) —
              the API rejects anything above these limits. &quot;All customers&quot; bulk credits
              skip the batch cap by design.
            </p>
          </fieldset>

          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Maintenance mode</p>
                <p id="maintenance-warning" className="mt-1 text-sm text-red-700">
                  This will show a maintenance page to all users and block new orders platform-wide.
                </p>
              </div>
              <ToggleSwitch
                checked={platform.maintenance}
                onChange={(v) => setPlatform({ ...platform, maintenance: v })}
                label="Maintenance mode"
                hideLabel
                describedBy="maintenance-warning"
              />
            </div>
          </div>

          <button type="submit" disabled={saveSettingsM.isPending} className="btn-primary">
            {saveSettingsM.isPending ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      )}

      {tab === 'Activity log' && (
        <DataTable
          data={logQ.data || []}
          columns={[
            { key: 'createdAt', label: 'When', render: (r) => formatDateTime(r.createdAt) },
            { key: 'adminName', label: 'Admin', render: (r) => (
              <div>
                <p className="font-medium text-slate-900">{r.adminName}</p>
                <span className={`mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ROLE_BADGE_STYLES[r.adminRole] || 'bg-slate-50'}`}>
                  {ROLE_LABELS[r.adminRole] || r.adminRole}
                </span>
              </div>
            ) },
            { key: 'action', label: 'Action' },
            { key: 'entityType', label: 'Type' },
            { key: 'ipAddress', label: 'IP address', render: (r) => <span className="font-mono text-xs text-slate-500">{r.ipAddress}</span> },
          ]}
          isLoading={logQ.isLoading}
          caption="Recent admin activity log."
          pagination={{ pageSize: 10 }}
          emptyMessage="No activity recorded."
        />
      )}

      <Modal open={inviteOpen} title="Invite admin" onClose={handleCloseInviteModal}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!inviteForm.name.trim()) { setInviteError('Name is required'); return; }
            if (!EMAIL_REGEX.test(inviteForm.email.trim())) { setInviteError('Enter a valid email address'); return; }
            inviteMutation.mutate(inviteForm);
          }}
          className="space-y-4"
        >
          {inviteError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{inviteError}</p>}
          <div>
            <label htmlFor="inv-name" className="label">Full name</label>
            <input id="inv-name" type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="inv-email" className="label">Email</label>
            <input id="inv-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="inv-role" className="label">Role</label>
            <select id="inv-role" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="input">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleCloseInviteModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={inviteMutation.isPending} className="btn-primary flex-1">
              {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Revoke admin access?"
        message={`${revokeTarget?.name ?? ''} will immediately lose access to the admin portal.`}
        confirmLabel="Revoke access"
        destructive
        onCancel={handleCloseRevokeModal}
        onConfirm={() => deactivateMutation.mutate(revokeTarget.id)}
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
