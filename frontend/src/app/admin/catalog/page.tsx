'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminFetchCatalog,
  adminSaveCatalogEntry,
} from '@/lib/api/catalog';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconPlus, IconTrash, IconRefreshCw } from '@/components/icons';

/**
 * Catalogue manager — services, paper types/sizes and every customization
 * option group live in the database (CatalogEntry rows). Editing a group
 * here and saving propagates to seller dashboards and the customer order
 * flow without a deploy.
 */

type FieldKind = 'text' | 'number' | 'checkbox' | 'list';

interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  optional?: boolean;
}

interface GroupSpec {
  key: string;
  kind: 'rows' | 'services';
  description: string;
  fields: FieldSpec[];
}

const GROUPS: GroupSpec[] = [
  {
    key: 'service-categories',
    kind: 'services',
    description: 'Services sellers can offer, grouped by category.',
    fields: [],
  },
  {
    key: 'paper-types',
    kind: 'rows',
    description: 'Paper stocks offered to customers and sellers.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text', placeholder: 'e.g. recycled' },
      { key: 'label', label: 'Label', kind: 'text', placeholder: 'e.g. Recycled Paper' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true, placeholder: '80 GSM eco paper' },
      { key: 'multiplier', label: 'Multiplier ×', kind: 'number' },
    ],
  },
  {
    key: 'paper-sizes',
    kind: 'rows',
    description: 'Sheet sizes offered to customers and sellers.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text', placeholder: 'e.g. A5' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
      { key: 'multiplier', label: 'Multiplier ×', kind: 'number' },
    ],
  },
  {
    key: 'finishing-options',
    kind: 'rows',
    description: 'Optional finishing add-ons with a fixed per-unit price.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'price', label: 'Price (₹)', kind: 'number' },
    ],
  },
  {
    key: 'cover-types',
    kind: 'rows',
    description: 'Cover materials for binding services.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'spiral-coil-types',
    kind: 'rows',
    description: 'Coil choices for Spiral Binding.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'spiral-cover-types',
    kind: 'rows',
    description: 'Cover sheet choices for Spiral Binding.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'cover-colors',
    kind: 'rows',
    description: 'Hard binding cover fabrics (swatch class/hex drive the UI).',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'class', label: 'Swatch class', kind: 'text', optional: true, placeholder: 'bg-[#000080]' },
      { key: 'hex', label: 'Hex', kind: 'text', optional: true, placeholder: '#000080' },
    ],
  },
  {
    key: 'cover-text-colors',
    kind: 'rows',
    description: 'Foil text colours for Hard Binding.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'class', label: 'Swatch class', kind: 'text', optional: true },
      { key: 'hex', label: 'Hex', kind: 'text', optional: true },
    ],
  },
  {
    key: 'twin-loop-wire-colors',
    kind: 'rows',
    description: 'Twin Loop wire colours (premium flag shows the badge).',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'class', label: 'Swatch class', kind: 'text', optional: true },
      { key: 'premium', label: 'Premium', kind: 'checkbox', optional: true },
    ],
  },
  {
    key: 'twin-loop-front-covers',
    kind: 'rows',
    description: 'Twin Loop front cover sheets.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'twin-loop-back-covers',
    kind: 'rows',
    description: 'Twin Loop back cover sheets.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'card-shapes',
    kind: 'rows',
    description: 'Business card die-cut shapes.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'card-papers',
    kind: 'rows',
    description: 'Card paper stocks and textures.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
  {
    key: 'card-sizes',
    kind: 'rows',
    description: 'Business card cut sizes.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true, placeholder: '89 × 51 mm' },
    ],
  },
  {
    key: 'card-corners',
    kind: 'rows',
    description: 'Corner styles; incompatibleWith lists shapes that reject it.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
      { key: 'incompatibleWith', label: 'Incompatible shapes (comma-separated)', kind: 'list', optional: true },
    ],
  },
  {
    key: 'card-print-sides',
    kind: 'rows',
    description: 'Single / double-sided card printing choices.',
    fields: [
      { key: 'value', label: 'Value', kind: 'text' },
      { key: 'label', label: 'Label', kind: 'text' },
      { key: 'hint', label: 'Hint', kind: 'text', optional: true },
    ],
  },
];

type Row = Record<string, unknown>;
type DraftMap = Record<string, Row[]>;

interface ServiceCategoryRow {
  id: string;
  name: string;
  description?: string;
  services: { id: string; name: string }[];
}

const inputCls = 'input py-1.5 text-xs';

export default function AdminCatalogPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-catalog'],
    queryFn: adminFetchCatalog,
  });

  const [drafts, setDrafts] = useState<DraftMap>({});
  useEffect(() => {
    if (data) {
      setDrafts(
        Object.fromEntries(
          GROUPS.map((group) => [
            group.key,
            ((data[group.key]?.data as Row[] | undefined) ?? []).map((row) => ({
              ...row,
            })),
          ]),
        ),
      );
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: adminSaveCatalogEntry,
    onSuccess: (_entry, payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      showToast(`Saved ${payload.key}`);
    },
    onError: (err: any) =>
      showToast(err?.message || 'Could not save catalogue group', 'error'),
  });

  const updateRow = (groupKey: string, index: number, field: string, value: unknown) => {
    setDrafts((current) => ({
      ...current,
      [groupKey]: current[groupKey].map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addRow = (group: GroupSpec) => {
    const blank: Row = {};
    group.fields.forEach((field) => {
      blank[field.key] =
        field.kind === 'number' ? '' : field.kind === 'checkbox' ? false : '';
    });
    setDrafts((current) => ({
      ...current,
      [group.key]: [...(current[group.key] ?? []), blank],
    }));
  };

  const removeRow = (groupKey: string, index: number) => {
    setDrafts((current) => ({
      ...current,
      [groupKey]: current[groupKey].filter((_, i) => i !== index),
    }));
  };

  /** Normalise a row before saving: drop empty optional fields, cast numbers. */
  const cleanRow = (group: GroupSpec, row: Row): Row => {
    const cleaned: Row = {};
    group.fields.forEach((field) => {
      const raw = row[field.key];
      if (field.kind === 'number') {
        if (raw !== '' && raw !== undefined && raw !== null) {
          cleaned[field.key] = Number(raw);
        }
        return;
      }
      if (field.kind === 'checkbox') {
        if (raw !== undefined) cleaned[field.key] = Boolean(raw);
        return;
      }
      if (field.kind === 'list') {
        const items = String(raw ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (items.length > 0) cleaned[field.key] = items;
        return;
      }
      const text = String(raw ?? '').trim();
      if (text !== '' || !field.optional) cleaned[field.key] = text;
    });
    return cleaned;
  };

  const saveGroup = (group: GroupSpec) => {
    const rows = (drafts[group.key] ?? []).map((row) => cleanRow(group, row));
    saveMutation.mutate({ key: group.key, data: rows });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="card flex items-center justify-between p-6">
          <p className="text-sm font-medium text-red-600">
            Could not load the catalogue. Check that the backend is running
            and migrations are applied.
          </p>
          <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catalogue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Services, paper types/sizes and every customization option live
            here — edits instantly apply to all sellers and customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary text-xs"
        >
          <IconRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <div className="mt-6 space-y-6">
        {GROUPS.map((group) =>
          group.kind === 'services' ? (
            <ServiceCategoriesEditor
              key={group.key}
              rows={(drafts[group.key] as unknown as ServiceCategoryRow[]) ?? []}
              label={data?.[group.key]?.label ?? group.key}
              description={group.description}
              saving={saveMutation.isPending}
              onChange={(rows) =>
                setDrafts((current) => ({
                  ...current,
                  [group.key]: rows as unknown as Row[],
                }))
              }
              onSave={() =>
                saveMutation.mutate({
                  key: group.key,
                  data: drafts[group.key] ?? [],
                })
              }
            />
          ) : (
            <section key={group.key} className="card overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  {data?.[group.key]?.label ?? group.key}
                </h2>
                <p className="text-xs text-slate-500">{group.description}</p>
              </div>

              <div className="divide-y divide-slate-100">
                {(drafts[group.key] ?? []).map((row, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 px-5 py-2.5"
                  >
                    {group.fields.map((field) =>
                      field.kind === 'checkbox' ? (
                        <label
                          key={field.key}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(row[field.key])}
                            onChange={(event) =>
                              updateRow(group.key, index, field.key, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          {field.label}
                        </label>
                      ) : (
                        <input
                          key={field.key}
                          type={field.kind === 'number' ? 'number' : 'text'}
                          step={field.kind === 'number' ? '0.1' : undefined}
                          min={field.kind === 'number' ? 0 : undefined}
                          value={
                            field.kind === 'list'
                              ? Array.isArray(row[field.key])
                                ? (row[field.key] as string[]).join(', ')
                                : ''
                              : String(row[field.key] ?? '')
                          }
                          placeholder={field.placeholder ?? field.label}
                          title={field.label}
                          onChange={(event) =>
                            updateRow(group.key, index, field.key, event.target.value)
                          }
                          className={`${inputCls} ${
                            field.kind === 'number' ? 'w-20' : 'min-w-0 flex-1'
                          }`}
                        />
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => removeRow(group.key, index)}
                      className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete row"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                <button
                  type="button"
                  onClick={() => addRow(group)}
                  className="btn-secondary text-xs"
                >
                  <IconPlus className="h-3.5 w-3.5" /> Add row
                </button>
                <button
                  type="button"
                  onClick={() => saveGroup(group)}
                  disabled={saveMutation.isPending}
                  className="btn-primary text-xs"
                >
                  {saveMutation.isPending ? 'Saving…' : `Save ${data?.[group.key]?.label ?? 'group'}`}
                </button>
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}

/* ─────────────── nested editor for service-categories ─────────────── */

function ServiceCategoriesEditor({
  rows,
  label,
  description,
  saving,
  onChange,
  onSave,
}: {
  rows: ServiceCategoryRow[];
  label: string;
  description: string;
  saving: boolean;
  onChange: (rows: ServiceCategoryRow[]) => void;
  onSave: () => void;
}) {
  const updateCategory = (index: number, patch: Partial<ServiceCategoryRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateService = (
    catIndex: number,
    serviceIndex: number,
    patch: Partial<{ id: string; name: string }>,
  ) => {
    onChange(
      rows.map((row, i) =>
        i === catIndex
          ? {
              ...row,
              services: row.services.map((service, j) =>
                j === serviceIndex ? { ...service, ...patch } : service,
              ),
            }
          : row,
      ),
    );
  };

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-bold text-slate-900">{label}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {rows.map((category, catIndex) => (
          <div
            key={catIndex}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={category.id}
                placeholder="Category ID"
                title="Category ID (used internally)"
                onChange={(event) =>
                  updateCategory(catIndex, { id: event.target.value })
                }
                className={`${inputCls} w-32 font-mono`}
              />
              <input
                type="text"
                value={category.name}
                placeholder="Category name"
                title="Category name"
                onChange={(event) =>
                  updateCategory(catIndex, { name: event.target.value })
                }
                className={`${inputCls} min-w-0 flex-1`}
              />
              <input
                type="text"
                value={category.description ?? ''}
                placeholder="Description (optional)"
                title="Description"
                onChange={(event) =>
                  updateCategory(catIndex, { description: event.target.value })
                }
                className={`${inputCls} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== catIndex))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Delete category"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {category.services.map((service, serviceIndex) => (
                <div key={serviceIndex} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={service.id}
                    placeholder="service-id"
                    title="Service ID (used internally)"
                    onChange={(event) =>
                      updateService(catIndex, serviceIndex, {
                        id: event.target.value,
                      })
                    }
                    className={`${inputCls} w-40 font-mono`}
                  />
                  <input
                    type="text"
                    value={service.name}
                    placeholder="Service name"
                    title="Service name"
                    onChange={(event) =>
                      updateService(catIndex, serviceIndex, {
                        name: event.target.value,
                      })
                    }
                    className={`${inputCls} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCategory(catIndex, {
                        services: category.services.filter(
                          (_, j) => j !== serviceIndex,
                        ),
                      })
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete service"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateCategory(catIndex, {
                    services: [
                      ...category.services,
                      { id: '', name: '' },
                    ],
                  })
                }
                className="btn-secondary text-xs"
              >
                <IconPlus className="h-3.5 w-3.5" /> Add service
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange([...rows, { id: '', name: '', description: '', services: [] }])
          }
          className="btn-secondary text-xs"
        >
          <IconPlus className="h-3.5 w-3.5" /> Add category
        </button>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary text-xs"
        >
          {saving ? 'Saving…' : 'Save Service categories'}
        </button>
      </div>
    </section>
  );
}
