'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTeam } from '@/lib/api/seller-inventory';
import type { TeamMember, TeamRole } from '@/lib/mock-data/seller-inventory';
import TeamMemberRow from '@/components/seller-dashboard/TeamMemberRow';
import Modal from '@/components/seller-dashboard/Modal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { IconAlertCircle, IconPlus, IconRefreshCw, IconUsers } from '@/components/icons';

const ROLES: { value: TeamRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'operator', label: 'Operator' },
  { value: 'support', label: 'Support' },
];

export default function SellerTeamPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-team'],
    queryFn: fetchTeam,
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'operator' as TeamRole });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setMembers(data);
  }, [data]);

  const handleInvite = (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setFormError('Enter a valid email address');
      return;
    }

    setMembers((previous) => [
      ...previous,
      {
        id: `tm-${Date.now()}`,
        name: form.name.trim(),
        role: form.role,
        email: form.email.trim(),
        phone: '—',
        status: 'active',
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ]);

    showToast(`Invitation sent to ${form.email.trim()}`);
    setForm({ name: '', email: '', role: 'operator' });
    setFormError(null);
    setModalOpen(false);
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load your team</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-600">
            Give your staff access to the seller hub.
          </p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <IconPlus className="h-4 w-4" /> Invite team member
        </button>
      </header>

      <div className="card mt-6 overflow-hidden">
        {isLoading ? (
          <div className="h-64 animate-pulse bg-slate-100" />
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <IconUsers className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No team members yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Invite staff so they can manage orders with you.
            </p>
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary mt-6">
              <IconPlus className="h-4 w-4" /> Invite your first member
            </button>
          </div>
        ) : (
          members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onToggleStatus={(id, active) =>
                setMembers((previous) =>
                  previous.map((entry) =>
                    entry.id === id
                      ? { ...entry, status: active ? 'active' : 'inactive' }
                      : entry,
                  ),
                )
              }
              onRemove={(id) => {
                const removed = members.find((entry) => entry.id === id);
                setMembers((previous) => previous.filter((entry) => entry.id !== id));
                if (removed) showToast(`${removed.name} removed from your team`);
              }}
            />
          ))
        )}
      </div>

      <Modal open={modalOpen} title="Invite team member" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleInvite} className="space-y-4">
          {formError && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <IconAlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </p>
          )}

          <div>
            <label htmlFor="member-name" className="label">
              Full name
            </label>
            <input
              id="member-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Sneha Dutta"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="member-email" className="label">
              Email
            </label>
            <input
              id="member-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="sneha@yourshop.in"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="member-role" className="label">
              Role
            </label>
            <select
              id="member-role"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as TeamRole })}
              className="input"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Send invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
