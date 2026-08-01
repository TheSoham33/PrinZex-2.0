'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconArrowUpDown,
  IconPackageOpen,
  IconRefreshCw,
  IconSearch,
} from '@/components/icons';

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  /** Tailwind width class, e.g. "w-32". */
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Slot for filter controls rendered above the table. */
  filters?: React.ReactNode;
  pagination?: { pageSize: number };
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  caption?: string;
  /** Row selection (used by the payouts page). */
  selectable?: boolean;
  rowId?: (row: T) => string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Rendered above the table when at least one row is selected. */
  bulkBar?: React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

function getValue<T>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[key as string];
}

/** Flatten a row's primitive fields so search can match across all of them. */
function rowText<T>(row: T): string {
  return Object.values(row as Record<string, unknown>)
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .join(' ')
    .toLowerCase();
}

export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  error = null,
  onRetry,
  searchable = false,
  searchPlaceholder = 'Search…',
  filters,
  pagination,
  emptyMessage = 'No records found.',
  onRowClick,
  caption,
  selectable = false,
  rowId,
  selectedIds = [],
  onSelectionChange,
  bulkBar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) => rowText(row).includes(term));
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const pageSize = pagination?.pageSize ?? Math.max(1, sorted.length);
  const pageCount = pagination ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible = pagination
    ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : sorted;

  // Reset to the first page whenever the result set changes shape.
  useEffect(() => {
    setPage(0);
  }, [search, sortKey, sortDir, data.length]);

  const visibleIds = rowId ? visible.map(rowId) : [];
  const selectedOnPage = visibleIds.filter((id) => selectedIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedOnPage.length === visibleIds.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  // `indeterminate` is a DOM property, not an attribute — must be set via ref.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const ariaSort = (key: string): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key || !sortDir) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const totalCols = columns.length + (selectable ? 1 : 0);

  return (
    <div>
      {(searchable || filters) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="input pl-9"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-end gap-3">{filters}</div>}
        </div>
      )}

      {selectable && selectedIds.length > 0 && bulkBar && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedIds.length} selected
          </p>
          {bulkBar}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                {selectable && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => {
                        if (!onSelectionChange) return;
                        onSelectionChange(
                          event.target.checked
                            ? Array.from(new Set([...selectedIds, ...visibleIds]))
                            : selectedIds.filter((id) => !visibleIds.includes(id)),
                        );
                      }}
                      aria-label="Select all rows"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </th>
                )}

                {columns.map((column) => {
                  const key = String(column.key);
                  const sortState = ariaSort(key);
                  return (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={column.sortable ? sortState : undefined}
                      className={`px-4 py-3 ${column.width ?? ''}`}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className="inline-flex items-center gap-1.5 uppercase tracking-wide transition-colors hover:text-slate-800"
                        >
                          {column.label}
                          {sortState === 'none' && (
                            <IconArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {sortState === 'ascending' && (
                            <IconArrowUp className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {sortState === 'descending' && (
                            <IconArrowDown className="h-3.5 w-3.5 text-blue-600" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                    {Array.from({ length: totalCols }).map((__, colIndex) => (
                      <td key={colIndex} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-12">
                    <div className="flex flex-col items-center text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <IconAlertCircle className="h-6 w-6" />
                      </span>
                      <p className="mt-3 font-semibold text-slate-900">Couldn&apos;t load data</p>
                      <p className="mt-1 text-sm text-slate-600">{error.message}</p>
                      {onRetry && (
                        <button type="button" onClick={onRetry} className="btn-primary mt-4">
                          <IconRefreshCw className="h-4 w-4" /> Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-12">
                    <div className="flex flex-col items-center text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <IconPackageOpen className="h-6 w-6" />
                      </span>
                      <p className="mt-3 text-sm text-slate-600">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((row, index) => {
                  const id = rowId ? rowId(row) : String(index);
                  const checked = selectedIds.includes(id);
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`border-b border-slate-100 last:border-0 ${
                        onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                      } ${checked ? 'bg-blue-50/40' : ''}`}
                    >
                      {selectable && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              if (!onSelectionChange) return;
                              onSelectionChange(
                                event.target.checked
                                  ? [...selectedIds, id]
                                  : selectedIds.filter((s) => s !== id),
                              );
                            }}
                            aria-label={`Select row ${id}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                          />
                        </td>
                      )}

                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className="px-4 py-3 align-middle text-sm text-slate-700"
                        >
                          {column.render
                            ? column.render(row)
                            : String(getValue(row, column.key) ?? '—')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && !isLoading && !error && sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {safePage * pageSize + 1}–
              {Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="btn-secondary text-xs"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-600">
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="btn-secondary text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
