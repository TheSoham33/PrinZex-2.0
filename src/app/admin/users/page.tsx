'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlatformUsers } from '@/lib/api/admin-users';
import type { PlatformUser } from '@/lib/mock-data/admin-users';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconBan, IconCheckCircle, IconPlus } from '@/components/icons';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchPlatformUsers,
  });

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [drawerUser, setDrawerUser] = useState<PlatformUser | null>(null);
  const [blockTarget, setBlockTarget] = useState<PlatformUser | null>(null);
  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');

  useEffect(() => {
    if (data) setUsers(data);
  }, [data]);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (statusFilter !== 'all' && u.status !== statusFilter) return false;
        if (fromDate && u.joinedAt < fromDate) return false;
        if (toDate && u.joinedAt > toDate) return false;
        return true;
      }),
    [users, statusFilter, fromDate, toDate],
  );

  const toggleBlock = (user: PlatformUser) => {
    const next = user.status === 'blocked' ? 'active' : 'blocked';
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)));
    showToast(`${user.name} ${next === 'blocked' ? 'blocked' : 'unblocked'}`);
  };

  const applyCredit = (userId: string) => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, walletBalance: u.walletBalance + amount } : u)),
    );
    showToast(`${formatCurrency(amount)} credited`);
    setCreditFor(null);
    setCreditAmount('');
  };

  const columns: DataTableColumn<PlatformUser>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{r.name}</p>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'joinedAt', label: 'Joined', sortable: true, render: (r) => formatDate(r.joinedAt) },
    { key: 'ordersPlaced', label: 'Orders', sortable: true },
    { key: 'walletBalance', label: 'Wallet', sortable: true, render: (r) => formatCurrency(r.walletBalance) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setDrawerUser(r)} className="btn-secondary text-xs">
            View
          </button>
          {r.status === 'blocked' ? (
            <button type="button" onClick={() => toggleBlock(r)} className="btn-secondary text-xs text-green-700">
              <IconCheckCircle className="h-3.5 w-3.5" /> Unblock
            </button>
          ) : (
            <button type="button" onClick={() => setBlockTarget(r)} className="btn-secondary text-xs text-red-600">
              <IconBan className="h-3.5 w-3.5" /> Block
            </button>
          )}
          {creditFor === r.id ? (
            <span className="inline-flex items-center gap-1.5">
              <label htmlFor={`credit-${r.id}`} className="sr-only">
                Credit amount for {r.name}
              </label>
              <input
                id={`credit-${r.id}`}
                type="number"
                min={1}
                autoFocus
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyCredit(r.id);
                  if (e.key === 'Escape') setCreditFor(null);
                }}
                placeholder="₹"
                className="input w-20 py-1 text-xs"
              />
              <button type="button" onClick={() => applyCredit(r.id)} className="btn-primary text-xs">
                Add
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => { setCreditFor(r.id); setCreditAmount(''); }} className="btn-secondary text-xs">
              <IconPlus className="h-3.5 w-3.5" /> Credit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">{users.length} registered customers.</p>
      </header>

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by name or email"
        caption="Registered platform customers"
        pagination={{ pageSize: 8 }}
        emptyMessage="No users match these filters."
        filters={
          <>
            <div>
              <label htmlFor="status-filter" className="label text-xs">Status</label>
              <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label htmlFor="from-date" className="label text-xs">Joined from</label>
              <input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="to-date" className="label text-xs">Joined to</label>
              <input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input py-2 text-sm" />
            </div>
          </>
        }
      />

      <ConfirmModal
        open={Boolean(blockTarget)}
        title="Block this user?"
        message={`${blockTarget?.name ?? ''} will lose access to their account and cannot place new orders until unblocked.`}
        confirmLabel="Block user"
        destructive
        onCancel={() => setBlockTarget(null)}
        onConfirm={() => {
          if (blockTarget) toggleBlock(blockTarget);
          setBlockTarget(null);
        }}
      />

      <UserDetailDrawer
        open={Boolean(drawerUser)}
        onClose={() => setDrawerUser(null)}
        title={drawerUser?.name ?? ''}
        subtitle={drawerUser?.email}
        ariaLabel={`Details for ${drawerUser?.name ?? 'user'}`}
      >
        {drawerUser && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">User ID</dt><dd className="font-mono text-slate-900">{drawerUser.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{drawerUser.phone}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(drawerUser.joinedAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={drawerUser.status} /></dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Address book</h3>
              <div className="mt-2 space-y-2">
                {drawerUser.addresses.map((a) => (
                  <div key={a.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">{a.label}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{a.fullAddress}</p>
                  </div>
                ))}
                {drawerUser.addresses.length === 0 && <p className="text-sm text-slate-500">No saved addresses.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent orders</h3>
              <div className="mt-2 space-y-2">
                {drawerUser.recentOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{o.serviceName}</p>
                        <p className="truncate text-xs text-slate-500">{o.storeName}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      <span className="font-mono">{o.id}</span> · {formatCurrency(o.total)}
                    </p>
                  </div>
                ))}
                {drawerUser.recentOrders.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Wallet</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(drawerUser.walletBalance)}</p>
              <div className="mt-2 space-y-1.5">
                {drawerUser.recentTransactions.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-600">{t.description}</span>
                    <span className={`shrink-0 font-medium ${t.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                      {t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
                {drawerUser.recentTransactions.length === 0 && <p className="text-sm text-slate-500">No transactions.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Account activity</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Last login</dt><dd className="text-right text-slate-900">{formatDateTime(drawerUser.lastLogin)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Device</dt><dd className="text-right text-slate-900">{drawerUser.lastDevice}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">IP address</dt><dd className="font-mono text-slate-900">{drawerUser.lastIp}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}
