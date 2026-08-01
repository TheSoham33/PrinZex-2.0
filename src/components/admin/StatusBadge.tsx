/**
 * One badge for every status string used anywhere in the admin panel —
 * orders, sellers, payouts, delivery partners, tickets and documents.
 */

interface StatusMeta {
  label: string;
  className: string;
  dot: string;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  // Generic / shared
  active: { label: 'Active', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  blocked: { label: 'Blocked', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },

  // Orders
  placed: { label: 'Placed', className: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  new: { label: 'New', className: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  accepted: { label: 'Accepted', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500' },
  processing: { label: 'Processing', className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  ready_for_pickup: { label: 'Ready for pickup', className: 'bg-purple-50 text-purple-700 ring-purple-600/20', dot: 'bg-purple-500' },
  dispatched: { label: 'Dispatched', className: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  out_for_delivery: { label: 'Out for delivery', className: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  delivered: { label: 'Delivered', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  returned: { label: 'Returned', className: 'bg-slate-100 text-slate-700 ring-slate-500/20', dot: 'bg-slate-500' },
  refunded: { label: 'Refunded', className: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', dot: 'bg-cyan-500' },

  // Payouts
  paid: { label: 'Paid', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },

  // Tickets
  open: { label: 'Open', className: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },

  // Priorities
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  high: { label: 'High', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },

  // Documents
  verified: { label: 'Verified', className: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500' },
  needs_review: { label: 'Needs review', className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  invited: { label: 'Invited — pending login', className: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
};

/** Fall back to a readable label for any status not in the map. */
function fallback(status: string): StatusMeta {
  return {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    dot: 'bg-slate-400',
  };
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  /** Override the derived label (e.g. "Yes"/"No" for verified flags). */
  label?: string;
}

export default function StatusBadge({ status, size = 'sm', label }: StatusBadgeProps) {
  const meta = STATUS_MAP[status] ?? fallback(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${
        meta.className
      } ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label ?? meta.label}
    </span>
  );
}
