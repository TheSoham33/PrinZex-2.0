'use client';

import { IconPlus, IconTrash } from '@/components/icons';

export interface SlabRow {
  qty: number;
  rate: number;
}

/** Draft rows keep raw text so "1" while typing doesn't snap to a number. */
export interface SlabDraft {
  qty: string;
  rate: string;
}

export function toSlabs(rows: SlabDraft[]): SlabRow[] {
  return rows
    .map((row) => ({ qty: Number(row.qty), rate: Number(row.rate) }))
    .filter((row) => Number.isInteger(row.qty) && row.qty > 0 && row.rate > 0);
}

/**
 * Quantity slab pricing for Business Cards — each row means "from QTY
 * pieces, ₹RATE per piece". The customer's rate falls as quantity grows.
 * Saved as pricingOverrides.quantitySlabs[serviceId].
 */
export default function QuantitySlabEditor({
  serviceName,
  rows,
  onChange,
  onSave,
  saving,
}: {
  serviceName: string;
  rows: SlabDraft[];
  onChange: (rows: SlabDraft[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const patch = (index: number, field: keyof SlabDraft, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const complete = toSlabs(rows).length;

  return (
    <div className="space-y-4 border-t border-slate-100 bg-blue-50/40 px-4 py-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {serviceName} quantity pricing
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          From each quantity, what one card costs. Customers see lower slab
          rates as they order more.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">From</span>
            <input
              type="number"
              min={1}
              value={row.qty}
              placeholder="100"
              title="Quantity (pieces)"
              aria-label="Slab quantity"
              onChange={(event) => patch(index, 'qty', event.target.value)}
              className="input w-24 py-1.5 text-xs"
            />
            <span className="text-xs font-semibold text-slate-500">
              pieces → ₹
            </span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={row.rate}
              placeholder="4.00"
              title="Rate per piece (₹)"
              aria-label="Slab rate per piece"
              onChange={(event) => patch(index, 'rate', event.target.value)}
              className="input w-24 py-1.5 text-xs"
            />
            <span className="text-xs font-semibold text-slate-500">
              per piece
            </span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete slab"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange([...rows, { qty: '', rate: '' }])}
          className="btn-secondary text-xs"
        >
          <IconPlus className="h-3.5 w-3.5" /> Add slab
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || complete === 0 || complete !== rows.length}
          className="btn-primary text-xs"
        >
          {saving ? 'Saving…' : `Save ${serviceName} quantity pricing`}
        </button>
      </div>
    </div>
  );
}
