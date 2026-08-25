'use client';

import { useEffect, useRef, useState } from 'react';
import { PRICING_UNITS, type PricingUnit } from '@/lib/seller-types';
import type { SellerPricingEntry } from '@/lib/domain/seller-inventory';
import { formatCurrency } from '@/lib/utils';
import { IconChevronDown, IconChevronUp, IconPencil } from '@/components/icons';

interface PricingEditorProps {
  entry: SellerPricingEntry;
  onSave: (
    serviceId: string,
    basePrice: number,
    unit: string,
    minPages: number | null,
  ) => void;
  expanded?: boolean;
  onToggle?: () => void;
}

export default function PricingEditor({
  entry,
  onSave,
  expanded = false,
  onToggle,
}: PricingEditorProps) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(entry.basePrice));
  const [unit, setUnit] = useState(entry.unit);
  const [minPages, setMinPages] = useState(
    entry.minPages ? String(entry.minPages) : '',
  );
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      priceRef.current?.focus();
      priceRef.current?.select();
    }
  }, [editing]);

  const cancel = () => {
    setPrice(String(entry.basePrice));
    setUnit(entry.unit);
    setMinPages(entry.minPages ? String(entry.minPages) : '');
    setEditing(false);
  };

  const save = () => {
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const trimmed = minPages.trim();
    const parsedMinPages =
      trimmed === '' ? null : Math.max(1, Math.floor(Number(trimmed) || 1));
    onSave(entry.serviceId, parsed, unit, parsedMinPages);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4 last:border-0">
        <div className="min-w-[10rem] flex-1">
          <p className="text-sm font-medium text-slate-900">
            {entry.serviceName}
          </p>
        </div>

        <div className="w-28">
          <label htmlFor={`price-${entry.serviceId}`} className="label text-xs">
            Price (₹)
          </label>
          <input
            ref={priceRef}
            id={`price-${entry.serviceId}`}
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') cancel();
            }}
            className="input py-2 text-sm"
          />
        </div>

        <div className="w-36">
          <label htmlFor={`unit-${entry.serviceId}`} className="label text-xs">
            Unit
          </label>
          <select
            id={`unit-${entry.serviceId}`}
            value={unit}
            onChange={(event) => setUnit(event.target.value as PricingUnit)}
            className="input py-2 text-sm"
          >
            {PRICING_UNITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <label htmlFor={`min-pages-${entry.serviceId}`} className="label text-xs">
            Min. pages
          </label>
          <input
            id={`min-pages-${entry.serviceId}`}
            type="number"
            min={1}
            step={1}
            value={minPages}
            placeholder="None"
            title="Minimum PDF page count (leave empty for no minimum)"
            onChange={(event) => setMinPages(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') cancel();
            }}
            className="input py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={save} className="btn-primary text-xs">
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 last:border-0">
      <p className="min-w-[10rem] flex-1 text-sm font-medium text-slate-900">
        {entry.serviceName}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {formatCurrency(entry.basePrice)}
        <span className="ml-1 text-xs font-normal text-slate-500">
          {entry.unit}
        </span>
      </p>
      {entry.minPages ? (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
          Min. {entry.minPages} pages
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-secondary text-xs"
        aria-label={`Edit pricing for ${entry.serviceName}`}
      >
        <IconPencil className="h-3.5 w-3.5" /> Edit
      </button>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="btn-secondary h-10 w-10 p-0"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Hide' : 'Show'} customizations for ${entry.serviceName}`}
          title={`${expanded ? 'Hide' : 'Show'} customizations`}
        >
          {expanded ? (
            <IconChevronUp className="h-4 w-4" />
          ) : (
            <IconChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
