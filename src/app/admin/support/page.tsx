'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchSupportTickets } from '@/lib/api/admin-orders';
import {
  SUPPORT_AGENTS,
  TICKET_CATEGORY_LABELS,
  type SupportTicket,
  type TicketStatus,
} from '@/lib/mock-data/admin-orders';
import { useAppSelector } from '@/store/hooks';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmModal from '@/components/admin/ConfirmModal';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatDateTime } from '@/lib/utils';
import { IconCheckCircle, IconHeadphones, IconSend } from '@/components/icons';

function SupportInner() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const admin = useAppSelector((state) => state.adminAuth.admin);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: fetchSupportTickets,
  });

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [closeTarget, setCloseTarget] = useState<SupportTicket | null>(null);

  useEffect(() => {
    if (data) setTickets(data);
  }, [data]);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (agentFilter !== 'all' && t.assignedTo !== agentFilter) return false;
        return true;
      }),
    [tickets, statusFilter, priorityFilter, categoryFilter, agentFilter],
  );

  const current = drawerId ? tickets.find((t) => t.id === drawerId) ?? null : null;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0;

  const update = (id: string, patch: Partial<SupportTicket>) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const sendReply = () => {
    if (!current || !reply.trim()) return;
    update(current.id, {
      status: current.status === 'open' ? 'in_progress' : current.status,
      thread: [
        ...current.thread,
        {
          id: `m-${Date.now()}`,
          from: 'agent',
          author: admin?.name ?? 'Agent',
          body: reply.trim(),
          at: new Date().toISOString(),
        },
      ],
    });
    setReply('');
    showToast('Reply sent');
  };

  const columns: DataTableColumn<SupportTicket>[] = [
    { key: 'id', label: 'Ticket', sortable: true, render: (r) => <span className="font-mono font-medium text-slate-900">{r.id}</span> },
    { key: 'customerName', label: 'Customer', sortable: true },
    { key: 'subject', label: 'Subject', render: (r) => <span className="text-slate-700">{r.subject}</span> },
    { key: 'category', label: 'Category', sortable: true, render: (r) => TICKET_CATEGORY_LABELS[r.category] },
    { key: 'priority', label: 'Priority', sortable: true, render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'assignedTo', label: 'Assigned', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', sortable: true, render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => { setDrawerId(r.id); setReply(''); }} className="btn-secondary text-xs">View</button>
          {admin && r.assignedTo !== admin.name && (
            <button type="button" onClick={() => { update(r.id, { assignedTo: admin.name }); showToast(`${r.id} assigned to you`); }} className="btn-secondary text-xs">
              Assign to me
            </button>
          )}
          {r.status !== 'closed' && (
            <button type="button" onClick={() => setCloseTarget(r)} className="btn-secondary text-xs text-red-600">Close</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support</h1>
        <p className="mt-1 text-sm text-slate-600">Customer tickets across the platform.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="card flex items-center gap-2.5 px-4 py-2.5">
          <IconHeadphones className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-slate-600">Open</span>
          <span className="text-sm font-bold text-slate-900">{openCount}</span>
        </div>
        <div className="card flex items-center gap-2.5 px-4 py-2.5">
          <span className="text-sm text-slate-600">Avg. response</span>
          <span className="text-sm font-bold text-slate-900">42 min</span>
        </div>
        <div className="card flex items-center gap-2.5 px-4 py-2.5">
          <span className="text-sm text-slate-600">Resolution rate</span>
          <span className="text-sm font-bold text-slate-900">{resolutionRate}%</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search tickets"
        caption="Customer support tickets"
        pagination={{ pageSize: 8 }}
        emptyMessage="No tickets match these filters."
        filters={
          <>
            <div>
              <label htmlFor="t-status" className="label text-xs">Status</label>
              <select id="t-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-priority" className="label text-xs">Priority</label>
              <select id="t-priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-category" className="label text-xs">Category</label>
              <select id="t-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All</option>
                {Object.entries(TICKET_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-agent" className="label text-xs">Assigned to</label>
              <select id="t-agent" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="input py-2 text-sm">
                <option value="all">All</option>
                {SUPPORT_AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </>
        }
      />

      <ConfirmModal
        open={Boolean(closeTarget)}
        title="Close this ticket?"
        message={`Ticket ${closeTarget?.id ?? ''} will be marked as closed. The customer can still reply to reopen it.`}
        confirmLabel="Close ticket"
        destructive
        onCancel={() => setCloseTarget(null)}
        onConfirm={() => {
          if (closeTarget) {
            update(closeTarget.id, { status: 'closed' });
            showToast(`${closeTarget.id} closed`);
          }
          setCloseTarget(null);
        }}
      />

      <UserDetailDrawer
        open={Boolean(current)}
        onClose={() => setDrawerId(null)}
        title={current?.subject ?? ''}
        subtitle={current ? `${current.id} · ${current.customerName}` : undefined}
        ariaLabel={`Support ticket ${current?.id ?? ''} conversation`}
        footer={
          current && (
            <div>
              <label htmlFor="ticket-reply" className="label">Reply</label>
              <textarea
                id="ticket-reply"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
                className="input resize-none"
              />
              <button type="button" onClick={sendReply} disabled={!reply.trim()} className="btn-primary mt-2 w-full">
                <IconSend className="h-4 w-4" /> Send reply
              </button>
            </div>
          )
        }
      >
        {current && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="d-status" className="label text-xs">Status</label>
                <select id="d-status" value={current.status} onChange={(e) => update(current.id, { status: e.target.value as TicketStatus })} className="input py-2 text-sm">
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label htmlFor="d-priority" className="label text-xs">Priority</label>
                <select id="d-priority" value={current.priority} onChange={(e) => update(current.id, { priority: e.target.value as SupportTicket['priority'] })} className="input py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {current.linkedOrderId && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Linked order</p>
                <Link href={`/admin/orders/${current.linkedOrderId}`} className="mt-0.5 block font-mono text-sm font-medium text-blue-600 hover:underline">
                  {current.linkedOrderId}
                </Link>
              </div>
            )}

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Conversation</h3>
              <div className="mt-3 space-y-3">
                {current.thread.map((m) => (
                  <div key={m.id} className={`rounded-xl p-3 ${m.from === 'agent' ? 'ml-6 bg-blue-50' : 'mr-6 bg-slate-100'}`}>
                    <p className="text-xs font-bold text-slate-700">{m.author}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{m.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(m.at)}</p>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={() => { update(current.id, { status: 'resolved' }); showToast(`${current.id} resolved`); }}
              className="btn-secondary w-full text-green-700"
            >
              <IconCheckCircle className="h-4 w-4" /> Mark as resolved
            </button>
          </div>
        )}
      </UserDetailDrawer>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse bg-slate-100" />}>
      <SupportInner />
    </Suspense>
  );
}
