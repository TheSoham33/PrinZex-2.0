'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchActivityLog, fetchAdminAccounts, fetchCommissions } from '@/lib/api/admin-payouts';
import type { ActivityLogEntry, AdminAccount, CommissionRow } from '@/lib/types/admin-payouts';
import {
  ROLE_BADGE_STYLES,
  ROLE_LABELS,
  type AdminRole,
} from '@/store/slices/adminAuthSlice';
import { usePermission } from '../layout';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Modal from '@/components/seller-dashboard/Modal';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { formatDateTime } from '@/lib/utils';
import { IconArrowLeft, IconPlus, IconShieldOff } from '@/components/icons';

const TABS = ['Admin accounts', 'Commission', 'Platform', 'Activity log'] as const;
type Tab = (typeof TABS)[number];

const ROLES: AdminRole[] = [
  'super_admin', 'ops_manager', 'support_agent', 'finance_manager', 'content_manager',
];

export default function AdminSettingsPage() {
  // Page-level guard — hiding the nav item alone is not enough.
  const canManageAdmins = usePermission('canManageAdmins');
  const { showToast } = useToast();

  const accountsQ = useQuery({ queryKey: ['admin-accounts'], queryFn: fetchAdminAccounts, enabled: canManageAdmins });
  const commissionsQ = useQuery({ queryKey: ['admin-commissions'], queryFn: fetchCommissions, enabled: canManageAdmins });
  const logQ = useQuery({ queryKey: ['admin-activity-log'], queryFn: fetchActivityLog, enabled: canManageAdmins });

  const [tab, setTab] = useState<Tab>('Admin accounts');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'support_agent' as AdminRole });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [platform, setPlatform] = useState({
    name: 'PrinZex',
    supportEmail: 'support@prinzex.in',
    schedule: 'weekly' as 'weekly' | 'monthly',
    minPayout: '500',
    maintenance: false,
  });

  useEffect(() => { if (accountsQ.data) setAccounts(accountsQ.data); }, [accountsQ.data]);
  useEffect(() => { if (commissionsQ.data) setCommissions(commissionsQ.data); }, [commissionsQ.data]);

  if (!canManageAdmins) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <IconShieldOff className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Platform settings are restricted to administrators with account-management permission.
          If you need access, ask a super admin to update your role.
        </p>
        <Link href="/admin/dashboard" className="btn-primary mt-6">
          <IconArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const save = async (label: string) => {
    setSaving(true);
    setSaving(false);
    showToast(`${label} saved`);
  };

  const accountColumns: DataTableColumn<AdminAccount>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div>
    ) },
    { key: 'role', label: 'Role', sortable: true, render: (r) => (
      <select
        value={r.role}
        onChange={(e) => {
          setAccounts((prev) => prev.map((a) => (a.id === r.id ? { ...a, role: e.target.value as AdminRole } : a)));
          showToast(`${r.name}'s role updated`);
        }}
        aria-label={`Role for ${r.name}`}
        className={`rounded-md border-0 px-2 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE_STYLES[r.role]}`}
      >
        {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select>
    ) },
    { key: 'lastLogin', label: 'Last login', sortable: true, render: (r) => r.invited ? <span className="text-xs italic text-violet-600">Invited — pending login</span> : formatDateTime(r.lastLogin) },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch checked={r.active} onChange={(v) => setAccounts((prev) => prev.map((a) => (a.id === r.id ? { ...a, active: v } : a)))} label={`${r.name} active`} hideLabel />
    ) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <button type="button" onClick={() => setRevokeTarget(r)} className="btn-secondary text-xs text-red-600">Revoke access</button>
    ) },
  ];

  const logColumns: DataTableColumn<ActivityLogEntry>[] = [
    { key: 'timestamp', label: 'When', sortable: true, render: (r) => formatDateTime(r.timestamp) },
    { key: 'adminName', label: 'Admin', sortable: true, render: (r) => (
      <div>
        <p className="font-medium text-slate-900">{r.adminName}</p>
        <span className={`mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ROLE_BADGE_STYLES[r.adminRole]}`}>
          {ROLE_LABELS[r.adminRole]}
        </span>
      </div>
    ) },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'entity', label: 'Entity', render: (r) => <span className="text-slate-600">{r.entity}</span> },
    { key: 'ip', label: 'IP address', render: (r) => <span className="font-mono text-xs text-slate-500">{r.ip}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Admin accounts, commission and platform configuration.</p>
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
          <DataTable data={accounts} columns={accountColumns} isLoading={accountsQ.isLoading} searchable searchPlaceholder="Search admins" caption="Admin user accounts" emptyMessage="No admin accounts." />
        </>
      )}

      {tab === 'Commission' && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Commission by service category</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {commissions.map((row) => (
              <div key={row.categoryId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="min-w-[10rem] flex-1 text-sm font-medium text-slate-900">{row.category}</p>
                <div className="flex items-center gap-2">
                  <label htmlFor={`rate-${row.categoryId}`} className="sr-only">Commission rate for {row.category}</label>
                  <input
                    id={`rate-${row.categoryId}`}
                    type="number"
                    min={0}
                    max={100}
                    value={row.rate}
                    onChange={(e) => setCommissions((prev) => prev.map((c) => (c.categoryId === row.categoryId ? { ...c, rate: Number(e.target.value) } : c)))}
                    className="input w-20 py-1.5 text-sm"
                  />
                  <span className="text-sm text-slate-500">%</span>
                  <button type="button" onClick={() => showToast(`${row.category} commission saved`)} className="btn-secondary text-xs">Save</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => save('All commission rates')} disabled={saving} className="btn-primary mt-5">
            {saving ? 'Saving…' : 'Save all'}
          </button>
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
            <input id="p-min" type="number" min={0} value={platform.minPayout} onChange={(e) => setPlatform({ ...platform, minPayout: e.target.value })} className="input max-w-[12rem]" />
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

          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save settings'}</button>
        </form>
      )}

      {tab === 'Activity log' && (
        <DataTable
          data={logQ.data ?? []}
          columns={logColumns}
          isLoading={logQ.isLoading}
          searchable
          searchPlaceholder="Search the activity log"
          caption="Recent admin activity log."
          pagination={{ pageSize: 10 }}
          emptyMessage="No activity recorded."
        />
      )}

      <Modal open={inviteOpen} title="Invite admin" onClose={() => setInviteOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!inviteForm.name.trim()) { setInviteError('Name is required'); return; }
            if (!EMAIL_REGEX.test(inviteForm.email.trim())) { setInviteError('Enter a valid email address'); return; }
            setAccounts((prev) => [
              ...prev,
              {
                id: `ADM-${Date.now()}`,
                name: inviteForm.name.trim(),
                email: inviteForm.email.trim(),
                role: inviteForm.role,
                lastLogin: '',
                active: true,
                invited: true,
              },
            ]);
            showToast(`Invitation sent to ${inviteForm.email.trim()}`);
            setInviteForm({ name: '', email: '', role: 'support_agent' });
            setInviteError(null);
            setInviteOpen(false);
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
            <select id="inv-role" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as AdminRole })} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Send invite</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Revoke admin access?"
        message={`${revokeTarget?.name ?? ''} will immediately lose access to the admin portal.`}
        confirmLabel="Revoke access"
        destructive
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) {
            setAccounts((prev) => prev.filter((a) => a.id !== revokeTarget.id));
            showToast(`${revokeTarget.name}'s access revoked`);
          }
          setRevokeTarget(null);
        }}
      />
    </div>
  );
}
