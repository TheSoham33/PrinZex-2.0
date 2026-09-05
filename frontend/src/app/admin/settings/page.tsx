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
import { formatDateTime } from '@/lib/utils';
import { IconArrowLeft, IconPlus, IconShieldOff, IconRefreshCw } from '@/components/icons';

const TABS = ['Admin accounts', 'Commission', 'Platform', 'Activity log'] as const;
type Tab = (typeof TABS)[number];

const ROLE_OPTIONS = [
  'SUPER_ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT', 'FINANCE_MANAGER', 'CONTENT_MANAGER',
];

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
  });

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

  const save = async (label: string) => {
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
