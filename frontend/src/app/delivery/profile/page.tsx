'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { updateDeliveryBoy } from '@/store/slices/deliveryAuthSlice';
import {
  fetchDeliveryProfile,
  updateDeliveryBank,
  updateDeliveryProfile,
} from '@/lib/api/delivery';
import StatusBadge from '@/components/admin/StatusBadge';
import { useToast } from '@/components/seller-dashboard/Toast';
import { ErrorNote, FieldError } from '@/components/ui';
import { formatDate, scrollToField } from '@/lib/utils';

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'car', label: 'Car' },
] as const;

export default function DeliveryProfilePage() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const profileQ = useQuery({ queryKey: ['delivery-profile'], queryFn: fetchDeliveryProfile });
  const profile = profileQ.data;

  // ── Profile form ───────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', email: '', city: '', vehicleType: 'bike' as 'bike' | 'scooter' | 'car' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? '',
        email: profile.email ?? '',
        city: profile.city ?? '',
        vehicleType: (profile.vehicleType as 'bike' | 'scooter' | 'car') ?? 'bike',
      });
    }
  }, [profile]);

  const profileM = useMutation({
    mutationFn: updateDeliveryProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      dispatch(updateDeliveryBoy({ name: form.name.trim() }));
      showToast('Profile updated');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleProfileSave = (event: FormEvent) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) newErrors.name = 'Enter your full name';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) newErrors.email = 'Enter a valid email (or leave it empty)';
    if (form.city.trim().length < 2) newErrors.city = 'Enter your city';
    setErrors(newErrors);
    const firstInvalid = ['name', 'email', 'city'].find((key) => newErrors[key]);
    if (firstInvalid) {
      scrollToField(`dp-${firstInvalid}`);
      return;
    }
    profileM.mutate({
      name: form.name.trim(),
      email: form.email.trim() ? form.email.trim() : null,
      city: form.city.trim(),
      vehicleType: form.vehicleType,
    });
  };

  // ── Bank form ──────────────────────────────────────────────────────────
  const [bank, setBank] = useState({ holder: '', number: '', ifsc: '' });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const bankM = useMutation({
    mutationFn: updateDeliveryBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      showToast('Bank details updated');
      setBank({ holder: '', number: '', ifsc: '' });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleBankSave = (event: FormEvent) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (bank.holder.trim().length < 2) newErrors.holder = 'Enter the account holder name';
    if (!/^\d{9,18}$/.test(bank.number.trim())) newErrors.number = 'Account number must be 9–18 digits';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.trim().toUpperCase())) newErrors.ifsc = 'Invalid IFSC code (e.g. HDFC0001234)';
    setBankErrors(newErrors);
    const firstInvalid = ['holder', 'number', 'ifsc'].find((key) => newErrors[key]);
    if (firstInvalid) {
      scrollToField(`db-${firstInvalid}`);
      return;
    }
    bankM.mutate({
      accountHolderName: bank.holder.trim(),
      accountNumber: bank.number.trim(),
      ifscCode: bank.ifsc.trim().toUpperCase(),
    });
  };

  if (profileQ.isLoading) {
    return <p className="py-16 text-center text-sm text-slate-500">Loading your profile…</p>;
  }
  if (!profile) {
    return <ErrorNote message="Could not load your profile. Please refresh." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Joined {formatDate(profile.createdAt)} · {profile.totalDeliveries} deliveries · ★{' '}
            {profile.averageRating.toFixed(1)}
          </p>
        </div>
        <StatusBadge status={profile.status.toLowerCase()} />
      </header>

      {/* Editable profile */}
      <form onSubmit={handleProfileSave} className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dp-name" className="label">Full name</label>
            <input id="dp-name" type="text" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={`input ${errors.name ? 'input-error' : ''}`} />
            <FieldError message={errors.name || null} />
          </div>
          <div>
            <label htmlFor="dp-city" className="label">City</label>
            <input id="dp-city" type="text" value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); setErrors({ ...errors, city: '' }); }} className={`input ${errors.city ? 'input-error' : ''}`} />
            <FieldError message={errors.city || null} />
          </div>
          <div>
            <label htmlFor="dp-email" className="label">Email <span className="text-slate-400">(optional)</span></label>
            <input id="dp-email" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }} className={`input ${errors.email ? 'input-error' : ''}`} />
            <FieldError message={errors.email || null} />
          </div>
          <div>
            <label htmlFor="dp-phone" className="label">Phone (login id — fixed)</label>
            <input id="dp-phone" type="text" value={profile.phone} readOnly disabled className="input bg-slate-50 text-slate-500" />
          </div>
        </div>
        <fieldset>
          <legend className="label">Vehicle type</legend>
          <div className="flex gap-4">
            {VEHICLE_TYPES.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm capitalize text-slate-700">
                <input
                  type="radio"
                  name="vehicleType"
                  checked={form.vehicleType === option.value}
                  onChange={() => setForm({ ...form, vehicleType: option.value })}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Vehicle reg. no.</dt>
            <dd className="font-medium text-slate-900">{profile.vehicleRegNo}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Driving licence</dt>
            <dd className="font-medium text-slate-900">{profile.licenseNumber}</dd>
          </div>
        </dl>
        <button type="submit" disabled={profileM.isPending} className="btn-primary">
          {profileM.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      {/* Bank */}
      <form onSubmit={handleBankSave} className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Bank account (payouts)</h2>
          {profile.bankDetails && (
            <p className="mt-0.5 text-xs text-slate-500">
              Current: {profile.bankDetails.accountHolderName} · {profile.bankDetails.accountNumberMasked} ·{' '}
              {profile.bankDetails.ifscCode}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="db-holder" className="label">Account holder name</label>
            <input id="db-holder" type="text" value={bank.holder} onChange={(e) => { setBank({ ...bank, holder: e.target.value }); setBankErrors({ ...bankErrors, holder: '' }); }} className={`input ${bankErrors.holder ? 'input-error' : ''}`} />
            <FieldError message={bankErrors.holder || null} />
          </div>
          <div>
            <label htmlFor="db-number" className="label">Account number</label>
            <input id="db-number" type="text" inputMode="numeric" value={bank.number} onChange={(e) => { setBank({ ...bank, number: e.target.value.replace(/\D/g, '') }); setBankErrors({ ...bankErrors, number: '' }); }} className={`input ${bankErrors.number ? 'input-error' : ''}`} />
            <FieldError message={bankErrors.number || null} />
          </div>
          <div>
            <label htmlFor="db-ifsc" className="label">IFSC code</label>
            <input id="db-ifsc" type="text" maxLength={11} value={bank.ifsc} onChange={(e) => { setBank({ ...bank, ifsc: e.target.value.toUpperCase() }); setBankErrors({ ...bankErrors, ifsc: '' }); }} placeholder="HDFC0001234" className={`input ${bankErrors.ifsc ? 'input-error' : ''}`} />
            <FieldError message={bankErrors.ifsc || null} />
          </div>
        </div>
        <button type="submit" disabled={bankM.isPending} className="btn-primary">
          {bankM.isPending ? 'Saving…' : 'Save bank details'}
        </button>
      </form>

      {/* Documents + zones (read-only views of admin-managed data) */}
      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Documents (verified by admin)</h2>
        {profile.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {profile.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{doc.docType} · {formatDate(doc.uploadedAt)}</span>
                <StatusBadge status={doc.isVerified ? 'active' : 'pending'} label={doc.isVerified ? 'Verified' : 'Pending'} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile.zones.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Delivery zones</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.zones.map((zone) => (
              <span key={zone} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {zone}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
