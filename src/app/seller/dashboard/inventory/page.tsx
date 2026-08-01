'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInventory } from '@/lib/api/seller-inventory';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  type InventoryItem,
} from '@/lib/types/seller-inventory';
import InventoryRow from '@/components/seller-dashboard/InventoryRow';
import LowStockAlert from '@/components/seller-dashboard/LowStockAlert';
import Modal from '@/components/seller-dashboard/Modal';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconPlus, IconRefreshCw, IconSearch } from '@/components/icons';

interface NewItemForm {
  name: string;
  category: string;
  currentStock: string;
  unit: string;
  lowStockThreshold: string;
}

const EMPTY_FORM: NewItemForm = {
  name: '',
  category: INVENTORY_CATEGORIES[0],
  currentStock: '',
  unit: INVENTORY_UNITS[0],
  lowStockThreshold: '',
};

export default function SellerInventoryPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-inventory'],
    queryFn: fetchInventory,
  });

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Seed local editable state once the query resolves.
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const lowCount = items.filter((item) => item.currentStock < item.lowStockThreshold).length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term);
      const matchesLow = !lowOnly || item.currentStock < item.lowStockThreshold;
      return matchesSearch && matchesLow;
    });
  }, [items, search, lowOnly]);

  const handleStockChange = (id: string, stock: number) =>
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, currentStock: stock } : item)),
    );

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    const stock = Number(form.currentStock);
    const threshold = Number(form.lowStockThreshold);

    if (!form.name.trim()) {
      setFormError('Item name is required');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setFormError('Enter a valid current stock');
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      setFormError('Enter a valid low-stock threshold');
      return;
    }

    setItems((previous) => [
      {
        id: `inv-${Date.now()}`,
        name: form.name.trim(),
        category: form.category,
        currentStock: Math.round(stock),
        unit: form.unit,
        lowStockThreshold: Math.round(threshold),
        lastRestocked: new Date().toISOString().slice(0, 10),
      },
      ...previous,
    ]);

    showToast(`${form.name.trim()} added to inventory`);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(false);
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Couldn&apos;t load inventory</h1>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-6">
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track stock levels and reorder before you run out.
          </p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <IconPlus className="h-4 w-4" /> Add item
        </button>
      </header>

      {!isLoading && (
        <div className="mt-6">
          <LowStockAlert
            count={lowCount}
            active={lowOnly}
            onToggle={() => setLowOnly((previous) => !previous)}
          />
        </div>
      )}

      <div className="relative mt-4">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <label htmlFor="inventory-search" className="sr-only">
          Search inventory
        </label>
        <input
          id="inventory-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items by name…"
          className="input pl-9"
        />
      </div>

      {isLoading ? (
        <div className="card mt-4 h-96 animate-pulse bg-slate-100" />
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem]">
              <caption className="sr-only">
                Inventory items with stock levels and reorder actions
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-3 pl-8 pr-3">
                    Item
                  </th>
                  <th scope="col" className="hidden px-3 py-3 sm:table-cell">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Stock
                  </th>
                  <th scope="col" className="hidden px-3 py-3 md:table-cell">
                    Unit
                  </th>
                  <th scope="col" className="hidden px-3 py-3 lg:table-cell">
                    Threshold
                  </th>
                  <th scope="col" className="hidden px-3 py-3 lg:table-cell">
                    Last restocked
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      No items match your search.
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      onStockChange={handleStockChange}
                      onReorder={(target) => showToast(`Reorder placed for ${target.name}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Tip: click any stock number to edit it inline. Press Enter to save or Escape to cancel.
      </p>

      <Modal open={modalOpen} title="Add inventory item" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <IconAlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </p>
          )}

          <div>
            <label htmlFor="item-name" className="label">
              Item name
            </label>
            <input
              id="item-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="A4 Bond Paper (500 sheets)"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="item-category" className="label">
              Category
            </label>
            <select
              id="item-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="input"
            >
              {INVENTORY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="item-stock" className="label">
                Current stock
              </label>
              <input
                id="item-stock"
                type="number"
                min={0}
                value={form.currentStock}
                onChange={(event) => setForm({ ...form, currentStock: event.target.value })}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="item-unit" className="label">
                Unit
              </label>
              <select
                id="item-unit"
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                className="input"
              >
                {INVENTORY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="item-threshold" className="label">
              Low stock threshold
            </label>
            <input
              id="item-threshold"
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })}
              placeholder="10"
              className="input"
            />
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
              Add item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
