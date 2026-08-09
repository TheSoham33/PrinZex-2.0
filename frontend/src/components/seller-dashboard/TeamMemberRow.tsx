'use client';

import { useState } from 'react';
import { TEAM_ROLE_STYLES, type TeamMember } from '@/lib/mock-data/seller-inventory';
import { formatDate } from '@/lib/utils';
import ToggleSwitch from './ToggleSwitch';
import { IconTrash } from '@/components/icons';

interface TeamMemberRowProps {
  member: TeamMember;
  onToggleStatus: (id: string, active: boolean) => void;
  onRemove: (id: string) => void;
}

export default function TeamMemberRow({
  member,
  onToggleStatus,
  onRemove,
}: TeamMemberRowProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border-b border-slate-100 p-4 last:border-0">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {member.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </span>

        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{member.name}</p>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                TEAM_ROLE_STYLES[member.role]
              }`}
            >
              {member.role}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">{member.email}</p>
          <p className="mt-0.5 text-sm text-slate-500">{member.phone}</p>
          <p className="mt-1 text-xs text-slate-400">Joined {formatDate(member.joinedAt)}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ToggleSwitch
              checked={member.status === 'active'}
              onChange={(value) => onToggleStatus(member.id, value)}
              label={`${member.name} is ${member.status}`}
              hideLabel
            />
            <span
              className={`text-xs font-semibold ${
                member.status === 'active' ? 'text-green-600' : 'text-slate-400'
              }`}
            >
              {member.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${member.name}`}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-red-800">
            Remove <strong>{member.name}</strong> from your team?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRemove(member.id)}
              className="btn bg-red-600 text-xs text-white hover:bg-red-700"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
