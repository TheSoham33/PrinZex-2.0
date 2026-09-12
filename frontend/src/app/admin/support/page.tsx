'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSupportTickets, fetchSupportTicketById, replyToSupportTicket } from '@/lib/api/admin-orders';
import {
  TICKET_CATEGORY_LABELS,
} from '@/lib/domain/admin-orders';
import { useAppSelector } from '@/store/hooks';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import { useToast } from '@/components/seller-dashboard/Toast';
import { formatDateTime } from '@/lib/utils';
import { IconHeadphones, IconSend, IconRefreshCw } from '@/components/icons';

// Support desk — fully integrated with backend API
function SupportInner() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const admin = useAppSelector((state) => state.adminAuth.admin);

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const handleCloseDrawer = useCallback(() => setDrawerId(null), []);

  const { data: tickets = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter],
    queryFn: () => fetchSupportTickets({
      status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase(),
      priority: priorityFilter === 'all' ? undefined : priorityFilter.toUpperCase()
    }),
  });

  const { data: currentTicket, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-ticket-detail', drawerId],
    queryFn: () => drawerId ? fetchSupportTicketById(drawerId) : null,
    enabled: !!drawerId,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => replyToSupportTicket(drawerId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', drawerId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setReply('');
      showToast('Reply sent');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  // Safety: Move sendReply AFTER currentTicket query to avoid ReferenceError
  const sendReply = useCallback(() => {
    if (!currentTicket || !reply.trim()) return;
    replyMutation.mutate(reply.trim());
  }, [currentTicket, reply, replyMutation]);

  const openCount = Array.isArray(tickets) ? tickets.filter((t: any) => t.status?.toLowerCase() === 'open').length : 0;

  const columns: DataTableColumn<any>[] = [
    { key: 'id', label: 'Ticket', sortable: true, render: (r) => <span className="font-mono font-medium text-slate-900 text-xs">{r.id}</span> },
    { key: 'customerName', label: 'Customer', sortable: true, render: (r) => r.customer?.name || '—' },
    { key: 'subject', label: 'Subject', render: (r) => <span className="text-slate-700 truncate block max-w-xs">{r.subject}</span> },
    { key: 'category', label: 'Category', sortable: true, render: (r) => (TICKET_CATEGORY_LABELS as Record<string, string>)[r.category] || r.category },
    { key: 'priority', label: 'Priority', sortable: true, render: (r) => <StatusBadge status={r.priority?.toLowerCase()} /> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status?.toLowerCase()} /> },
    { key: 'createdAt', label: 'Created', sortable: true, render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => { setDrawerId(r.id); setReply(''); }} className="btn-secondary text-xs">View</button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support</h1>
          <p className="mt-1 text-sm text-slate-600">Customer tickets across the platform.</p>
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

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="card flex items-center gap-2.5 px-4 py-2.5">
          <IconHeadphones className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-slate-600">Open Tickets</span>
          <span className="text-sm font-bold text-slate-900">{openCount}</span>
        </div>
      </div>

      <DataTable
        data={Array.isArray(tickets) ? tickets : []}
        columns={columns}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search tickets"
        caption="Customer support tickets"
        pagination={{ pageSize: 10 }}
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
          </>
        }
      />

      <UserDetailDrawer
        open={Boolean(drawerId)}
        onClose={handleCloseDrawer}
        title={currentTicket?.subject ?? 'Loading...'}
        subtitle={currentTicket ? `${currentTicket.id} · ${currentTicket.customer?.name}` : undefined}
        ariaLabel="Ticket conversation"
        footer={
          currentTicket && (
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
              <button 
                type="button" 
                onClick={sendReply} 
                disabled={!reply.trim() || replyMutation.isPending} 
                className="btn-primary mt-2 w-full"
              >
                <IconSend className="h-4 w-4" /> {replyMutation.isPending ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          )
        }
      >
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        ) : currentTicket && (
          <div className="space-y-5">
            <div className="flex gap-2">
              <StatusBadge status={currentTicket.status?.toLowerCase()} />
              <StatusBadge status={currentTicket.priority?.toLowerCase()} />
            </div>

            {currentTicket.orderId && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Linked order</p>
                <Link href={`/admin/orders/${currentTicket.orderId}`} className="mt-0.5 block font-mono text-sm font-medium text-blue-600 hover:underline">
                  {currentTicket.orderId}
                </Link>
              </div>
            )}

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Conversation</h3>
              <div className="mt-3 space-y-3">
                {currentTicket.thread?.map((m: any) => (
                  <div key={m.id} className={`rounded-xl p-3 ${m.from === 'agent' ? 'ml-6 bg-blue-50' : 'mr-6 bg-slate-100'}`}>
                    <p className="text-xs font-bold text-slate-700">{m.author}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{m.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(m.at)}</p>
                  </div>
                ))}
                {(!currentTicket.thread || currentTicket.thread.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">No messages yet.</p>
                )}
              </div>
            </section>
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
