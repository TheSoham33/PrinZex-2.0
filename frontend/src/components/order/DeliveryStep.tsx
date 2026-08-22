'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  DELIVERY_SPEEDS,
  type DeliveryAddress,
  type DeliverySpeed,
} from '@/lib/domain/stores';
import { formatCurrency } from '@/lib/utils';
import type { OrderAction } from './orderReducer';
import { IconAlertCircle, IconMapPin, IconPlus, IconStore, IconTruck, IconX } from '@/components/icons';

export interface NewAddressInput {
  label: string;
  fullAddress: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
}

interface DeliveryStepProps {
  addresses: DeliveryAddress[];
  selectedAddress: DeliveryAddress | null;
  speed: DeliverySpeed;
  dispatch: React.Dispatch<OrderAction>;
  /** Persist the address; resolves true on success so the modal closes. */
  onAddAddress: (address: NewAddressInput) => Promise<boolean>;
  error: string | null;
}

export default function DeliveryStep({
  addresses,
  selectedAddress,
  speed,
  dispatch,
  onAddAddress,
  error,
}: DeliveryStepProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    label: '', 
    fullAddress: '', 
    phone: '', 
    city: 'Kolkata', 
    state: 'West Bengal', 
    pincode: '' 
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.label.trim() || !form.fullAddress.trim() || !form.phone.trim() || !form.pincode.trim() || !form.city.trim() || !form.state.trim()) {
      setFormError('All fields are required');
      return;
    }
    if (form.fullAddress.trim().length < 5) {
      setFormError('Full address must be at least 5 characters');
      return;
    }
    if (!/^(\+91\s?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setFormError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const saved = await onAddAddress({
        label: form.label.trim(),
        fullAddress: form.fullAddress.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      });

      if (saved) {
        setForm({
          label: '',
          fullAddress: '',
          phone: '',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '',
        });
        setFormError(null);
        setModalOpen(false);
      } else {
        setFormError('Could not save this address. Please try again.');
      }
    } catch {
      setFormError('Could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isPickup = speed === 'pickup';

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Delivery details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose where your prints should go and how fast you need them.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="label mb-0">
            Delivery address {!isPickup && <span className="text-red-500">*</span>}
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <IconPlus className="h-4 w-4" /> Add new
          </button>
        </div>

        {isPickup ? (
          <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <IconStore className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-900">Store pickup selected</p>
              <p className="mt-0.5 text-sm text-purple-700">
                No address needed — collect your order from the shop counter.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_ADDRESS', payload: address })}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  selectedAddress?.id === address.id
                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <IconMapPin
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedAddress?.id === address.id ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{address.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {address.fullAddress}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{address.phone}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="label">Delivery speed</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DELIVERY_SPEEDS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => dispatch({ type: 'SET_SPEED', payload: option.key })}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                speed === option.key
                  ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    speed === option.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {option.key === 'pickup' ? (
                    <IconStore className="h-5 w-5" />
                  ) : (
                    <IconTruck className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                  <p className="mt-1 text-xs font-medium text-slate-700">{option.eta}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-slate-900">
                {option.cost === 0 ? 'Free' : formatCurrency(option.cost)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setModalOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-address-title"
            className="relative w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="add-address-title" className="text-lg font-bold text-slate-900">
                Add a new address
              </h3>
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
              {formError && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <IconAlertCircle className="h-4 w-4 shrink-0" /> {formError}
                </p>
              )}

              <div>
                <label htmlFor="addr-label" className="label">
                  Label
                </label>
                <input
                  id="addr-label"
                  type="text"
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  placeholder="Home, Office, Hostel…"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="addr-full" className="label">
                  Full address
                </label>
                <textarea
                  id="addr-full"
                  rows={3}
                  value={form.fullAddress}
                  onChange={(event) => setForm({ ...form, fullAddress: event.target.value })}
                  placeholder="Flat, building, street, area"
                  className="input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="addr-city" className="label">City</label>
                  <input
                    id="addr-city"
                    type="text"
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="addr-state" className="label">State</label>
                  <input
                    id="addr-state"
                    type="text"
                    value={form.state}
                    onChange={(event) => setForm({ ...form, state: event.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="addr-pincode" className="label">Pincode</label>
                  <input
                    id="addr-pincode"
                    type="text"
                    value={form.pincode}
                    onChange={(event) => setForm({ ...form, pincode: event.target.value })}
                    placeholder="700001"
                    maxLength={6}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="addr-phone" className="label">
                    Phone number
                  </label>
                  <input
                    id="addr-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="9830012345"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
