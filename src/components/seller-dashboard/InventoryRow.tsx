'use client';

import { useEffect, useRef, useState } from 'react';
import type { InventoryItem } from '@/lib/types/seller-inventory';
import { formatDate } from '@/lib/utils';
import { IconAlertTriangle, IconRefreshCw } from '@/components/icons';

interface InventoryRowProps {
  item: InventoryItem;
  onStockChange: (id: string, stock: number) => void;
  onReorder: (item: InventoryItem) => void;
}

export default function InventoryRow({ item, onStockChange, onReorder }: InventoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.currentStock));
  const inputRef = useRef<HTMLInputElement>(null);

  const low = item.currentStock < item.lowStockThreshold;

  // Move focus into the field as soon as it appears.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft);
    onStockChange(item.id, Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : item.currentStock);
    setEditing(false);
  };

  return (
    <tr className={`border-b border-slate-100 last:border-0 ${low ? 'bg-amber-50/40' : ''}`}>
      <td className={`py-3 pl-4 pr-3 ${low ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}>
        <div className="flex items-start gap-2">
          {low && (
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{item.name}</p>
            {low && (
              <p className="mt-0.5 text-xs font-semibold text-amber-700">
                Below threshold — reorder soon
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="hidden px-3 py-3 text-sm text-slate-600 sm:table-cell">{item.category}</td>

      <td className="px-3 py-3">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={0}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setDraft(String(item.currentStock));
                setEditing(false);
              }
            }}
            aria-label={`Current stock for ${item.name}`}
            className="input w-24 py-1.5 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(item.currentStock));
              setEditing(true);
            }}
            aria-label={`Edit stock for ${item.name}, currently ${item.currentStock} ${item.unit}`}
            className={`rounded px-2 py-1 text-sm font-bold tabular-nums transition-colors hover:bg-slate-100 ${
              low ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {item.currentStock}
          </button>
        )}
      </td>

      <td className="hidden px-3 py-3 text-sm text-slate-600 md:table-cell">{item.unit}</td>
      <td className="hidden px-3 py-3 text-sm text-slate-600 lg:table-cell">
        {item.lowStockThreshold}
      </td>
      <td className="hidden px-3 py-3 text-sm text-slate-600 lg:table-cell">
        {formatDate(item.lastRestocked)}
      </td>

      <td className="py-3 pl-3 pr-4 text-right">
        <button
          type="button"
          onClick={() => onReorder(item)}
          className="btn-secondary whitespace-nowrap text-xs"
        >
          <IconRefreshCw className="h-3.5 w-3.5" /> Reorder
        </button>
      </td>
    </tr>
  );
}
