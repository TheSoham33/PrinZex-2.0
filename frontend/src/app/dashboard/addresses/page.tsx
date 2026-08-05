'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAddresses, createAddress, deleteAddress, setDefaultAddress } from '@/lib/api/customer';
import { IconAlertCircle, IconMapPin, IconPlus, IconTrash, IconX, IconRefreshCw } from '@/components/icons';

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const { data: addresses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ label: '', fullAddress: '', phone: '', city: 'Bengaluru', state: 'Karnataka', pincode: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setModalOpen(false);
      setForm({ label: '', fullAddress: '', phone: '', city: 'Bengaluru', state: 'Karnataka', pincode: '' });
    },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.label.trim() || !form.fullAddress.trim() || !form.phone.trim() || !form.pincode.trim()) {
      setError('All fields are required');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved addresses</h1>
          <p className="mt-1 text-sm text-slate-600">Where we deliver your prints.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <IconPlus className="h-4 w-4" /> Add address
        </button>
      </header>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card h-32 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="card py-12 text-center">
            <p className="text-red-600">Failed to load addresses</p>
            <button onClick={() => refetch()} className="btn-secondary mt-4">
              <IconRefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : addresses.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <IconMapPin className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No saved addresses</p>
            <p className="mt-1 text-sm text-slate-600">
              Add one now to check out faster next time.
            </p>
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary mt-6">
              <IconPlus className="h-4 w-4" /> Add your first address
            </button>
          </div>
        ) : (
          addresses.map((address: any) => (
            <div key={address.id} className="card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <IconMapPin className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{address.label}</p>
                  {address.isDefault && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{address.fullAddress}</p>
                <p className="mt-1.5 text-xs text-slate-500">{address.phone}</p>

                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => defaultMutation.mutate(address.id)}
                    disabled={defaultMutation.isPending}
                    className="mt-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Set as default
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => deleteMutation.mutate(address.id)}
                disabled={deleteMutation.isPending}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${address.label}`}
              >
                <IconTrash className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setModalOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add a new address</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}
              <div>
                <label htmlFor="label" className="label">Label</label>
                <input
                  id="label"
                  type="text"
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  placeholder="Home, Office, Hostel…"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="fullAddress" className="label">Full address</label>
                <textarea
                  id="fullAddress"
                  rows={3}
                  value={form.fullAddress}
                  onChange={(event) => setForm({ ...form, fullAddress: event.target.value })}
                  placeholder="Flat, building, street, area"
                  className="input resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="city" className="label">City</label>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="pincode" className="label">Pincode</label>
                  <input
                    id="pincode"
                    type="text"
                    value={form.pincode}
                    onChange={(event) => setForm({ ...form, pincode: event.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="label">Phone number</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="9830012345"
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Saving...' : 'Save address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
