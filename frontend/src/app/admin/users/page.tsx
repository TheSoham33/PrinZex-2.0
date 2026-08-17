'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlatformUsers, suspendUser, unsuspendUser, creditUserWallet } from '@/lib/api/admin-users';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { IconBan, IconCheckCircle, IconPlus, IconRefreshCw } from '@/components/icons';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerUser, setDrawerUser] = useState<any | null>(null);
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');

  const { data: users = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-users', statusFilter],
    queryFn: () => fetchPlatformUsers({ 
      role: 'CUSTOMER',
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => suspendUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('User account suspended');
      setBlockTarget(null);
      setSuspendReason('');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => unsuspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('User account unsuspended');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const creditMutation = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string, amount: number, reason: string }) => 
      creditUserWallet(id, { amount, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Wallet credited successfully');
      setCreditFor(null);
      setCreditAmount('');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleApplyCredit = (userId: string) => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    creditMutation.mutate({ id: userId, amount, reason: 'Admin adjustment' });
  };

  const handleCloseSuspendModal = useCallback(() => {
    setBlockTarget(null);
    setSuspendReason('');
  }, []);

  const handleConfirmSuspend = useCallback(() => {
    if (blockTarget) {
      suspendMutation.mutate({ id: blockTarget.id, reason: suspendReason });
    }
  }, [blockTarget, suspendReason, suspendMutation]);

  const handleCloseDrawer = useCallback(() => setDrawerUser(null), []);

  const columns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{r.name}</p>
        <p className="font-mono text-xs text-slate-400">{r.id}</p>
      </div>
    ) },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'createdAt', label: 'Joined', sortable: true, render: (r) => formatDate(r.createdAt) },
    { key: 'orderCount', label: 'Orders', sortable: true, render: (r) => r.orderCount || 0 },
    { key: 'walletBalance', label: 'Wallet', sortable: true, render: (r) => formatCurrency(r.walletBalance || 0) },
    { key: 'isActive', label: 'Status', sortable: true, render: (r) => (
      <StatusBadge status={r.isActive ? 'active' : 'suspended'} />
    ) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setDrawerUser(r)} className="btn-secondary text-xs">
            View
          </button>
          {!r.isActive ? (
            <button 
              type="button" 
              onClick={() => unsuspendMutation.mutate(r.id)} 
              disabled={unsuspendMutation.isPending}
              className="btn-secondary text-xs text-green-700"
            >
              <IconCheckCircle className="h-3.5 w-3.5" /> {unsuspendMutation.isPending ? '...' : 'Unsuspend'}
            </button>
          ) : (
            <button type="button" onClick={() => setBlockTarget(r)} className="btn-secondary text-xs text-red-600">
              <IconBan className="h-3.5 w-3.5" /> Suspend
            </button>
          )}
          {creditFor === r.id ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                autoFocus
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="₹"
                className="input w-20 py-1 text-xs"
              />
              <button 
                type="button" 
                onClick={() => handleApplyCredit(r.id)} 
                disabled={creditMutation.isPending}
                className="btn-primary text-xs"
              >
                {creditMutation.isPending ? '...' : 'Add'}
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
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-600">{users.length} registered customers.</p>
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
        data={users}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by name or email"
        caption="Registered platform customers"
        pagination={{ pageSize: 10 }}
        emptyMessage="No users match these filters."
        filters={
          <>
            <div>
              <label htmlFor="status-filter" className="label text-xs">Status</label>
              <select 
                id="status-filter" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="input py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </>
        }
      />

      <ConfirmModal
        open={Boolean(blockTarget)}
        title="Suspend this user?"
        message={`${blockTarget?.name ?? ''} will lose access to their account and cannot place new orders until unsuspended.`}
        confirmLabel="Suspend user"
        destructive
        confirmDisabled={!suspendReason.trim() || suspendMutation.isPending}
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
            placeholder="Why is this account being suspended?"
            className="input resize-none"
          />
        </div>
      </ConfirmModal>

      <UserDetailDrawer
        open={Boolean(drawerUser)}
        onClose={handleCloseDrawer}
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
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{drawerUser.phone || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{formatDate(drawerUser.createdAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={drawerUser.isActive ? 'active' : 'suspended'} /></dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Address book</h3>
              <div className="mt-2 space-y-2">
                {drawerUser.addresses?.map((a: any) => (
                  <div key={a.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">{a.label}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{a.fullAddress}</p>
                  </div>
                ))}
                {(!drawerUser.addresses || drawerUser.addresses.length === 0) && <p className="text-sm text-slate-500">No saved addresses.</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Wallet</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(drawerUser.walletBalance || 0)}</p>
              {drawerUser.recentTransactions?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {drawerUser.recentTransactions.slice(0, 3).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{t.description}</span>
                      <span className={`shrink-0 font-medium ${t.type === 'CREDIT' ? 'text-green-600' : 'text-slate-900'}`}>
                        {t.type === 'CREDIT' ? '+' : '−'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}
