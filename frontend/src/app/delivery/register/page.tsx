'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { registerDeliveryPartner } from '@/lib/api/delivery';
import { ErrorNote, FieldError } from '@/components/ui';
import { scrollToField } from '@/lib/utils';
import { IconTruck } from '@/components/icons';

/**
 * Public delivery-partner application (POST /api/delivery/register). Field
 * rules mirror the backend schema exactly — 10-digit phone, 9–18 digit
 * account number, IFSC shape — so validation errors should never reach the
 * API in the first place. On success the account is PENDING until an admin
 * approves it (Admin → Delivery boys).
 */
const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'car', label: 'Car' },
] as const;

// id → [validate, message] — first failing field wins, then scrolls to it.
const FIELDS: { id: string; label: string; validate: (v: string) => boolean; message: string }[] = [
  { id: 'dr-name', label: 'Full name', validate: (v) => v.trim().length >= 2, message: 'Enter your full name' },
  { id: 'dr-phone', label: 'Phone number', validate: (v) => /^\d{10}$/.test(v.trim()), message: 'Phone must be exactly 10 digits' },
  { id: 'dr-email', label: 'Email', validate: (v) => v.trim() === '' || /^\S+@\S+\.\S+$/.test(v.trim()), message: 'Enter a valid email (or leave it empty)' },
  { id: 'dr-city', label: 'City', validate: (v) => v.trim().length >= 2, message: 'Enter your city' },
  { id: 'dr-vehicle-reg', label: 'Vehicle registration number', validate: (v) => v.trim().length >= 5, message: 'Enter the vehicle registration number' },
  { id: 'dr-license', label: 'Driving licence number', validate: (v) => v.trim().length >= 5, message: 'Enter your driving licence number' },
  { id: 'dr-bank-holder', label: 'Account holder name', validate: (v) => v.trim().length >= 2, message: 'Enter the account holder name' },
  { id: 'dr-bank-number', label: 'Account number', validate: (v) => /^\d{9,18}$/.test(v.trim()), message: 'Account number must be 9–18 digits' },
  { id: 'dr-bank-ifsc', label: 'IFSC code', validate: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase()), message: 'Invalid IFSC code (e.g. HDFC0001234)' },
];

export default function DeliveryRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    vehicleType: 'bike' as 'bike' | 'scooter' | 'car',
    vehicleRegNo: '',
    licenseNumber: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const valueFor = (fieldId: string): string => {
    switch (fieldId) {
      case 'dr-name': return form.name;
      case 'dr-phone': return form.phone;
      case 'dr-email': return form.email;
      case 'dr-city': return form.city;
      case 'dr-vehicle-reg': return form.vehicleRegNo;
      case 'dr-license': return form.licenseNumber;
      case 'dr-bank-holder': return form.accountHolderName;
      case 'dr-bank-number': return form.accountNumber;
      default: return form.ifscCode;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    // First invalid field wins — message under it + scroll (site-wide rule).
    const newErrors: Record<string, string> = {};
    let firstInvalid: string | null = null;
    for (const field of FIELDS) {
      if (!field.validate(valueFor(field.id))) {
        newErrors[field.id] = field.message;
        firstInvalid ??= field.id;
      }
    }
    setErrors(newErrors);
    if (firstInvalid) {
      scrollToField(firstInvalid);
      return;
    }

    setSubmitting(true);
    try {
      await registerDeliveryPartner({
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        city: form.city.trim(),
        vehicleType: form.vehicleType,
        vehicleRegNo: form.vehicleRegNo.trim(),
        licenseNumber: form.licenseNumber.trim(),
        bankDetails: {
          accountHolderName: form.accountHolderName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
        },
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600">
            <IconTruck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Application received</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your delivery-partner application is under review. Once an admin approves it, sign in
            with your phone number — we&apos;ll send you an OTP, no password needed.
          </p>
          <Link href="/delivery/login" className="btn-primary mt-6 w-full">
            Go to rider login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <IconTruck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Become a Delivery Partner</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fill in your details and bank account for payouts. We review every application.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-8 p-6 sm:p-8">
          <ErrorNote message={formError} />

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dr-name" className="label">Full name <span className="text-red-500">*</span></label>
                <input id="dr-name" type="text" value={form.name} onChange={(e) => set('name')(e.target.value)} className={`input ${errors['dr-name'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-name']} />
              </div>
              <div>
                <label htmlFor="dr-phone" className="label">Phone number <span className="text-red-500">*</span></label>
                <input id="dr-phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} placeholder="10 digits" className={`input ${errors['dr-phone'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-phone']} />
                <p className="mt-1 text-xs text-slate-500">This becomes your login — OTP is sent here.</p>
              </div>
              <div>
                <label htmlFor="dr-email" className="label">Email <span className="text-slate-400">(optional)</span></label>
                <input id="dr-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} className={`input ${errors['dr-email'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-email']} />
              </div>
              <div>
                <label htmlFor="dr-city" className="label">City <span className="text-red-500">*</span></label>
                <input id="dr-city" type="text" value={form.city} onChange={(e) => set('city')(e.target.value)} className={`input ${errors['dr-city'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-city']} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vehicle</h2>
            <fieldset>
              <legend className="label">Vehicle type</legend>
              <div className="flex gap-4">
                {VEHICLE_TYPES.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm capitalize text-slate-700">
                    <input
                      type="radio"
                      name="vehicleType"
                      checked={form.vehicleType === option.value}
                      onChange={() => set('vehicleType')(option.value)}
                      className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dr-vehicle-reg" className="label">Vehicle registration no. <span className="text-red-500">*</span></label>
                <input id="dr-vehicle-reg" type="text" value={form.vehicleRegNo} onChange={(e) => set('vehicleRegNo')(e.target.value.toUpperCase())} placeholder="KA01AB1234" className={`input ${errors['dr-vehicle-reg'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-vehicle-reg']} />
              </div>
              <div>
                <label htmlFor="dr-license" className="label">Driving licence no. <span className="text-red-500">*</span></label>
                <input id="dr-license" type="text" value={form.licenseNumber} onChange={(e) => set('licenseNumber')(e.target.value.toUpperCase())} className={`input ${errors['dr-license'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-license']} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bank account (for payouts)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="dr-bank-holder" className="label">Account holder name <span className="text-red-500">*</span></label>
                <input id="dr-bank-holder" type="text" value={form.accountHolderName} onChange={(e) => set('accountHolderName')(e.target.value)} className={`input ${errors['dr-bank-holder'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-bank-holder']} />
              </div>
              <div>
                <label htmlFor="dr-bank-number" className="label">Account number <span className="text-red-500">*</span></label>
                <input id="dr-bank-number" type="text" inputMode="numeric" value={form.accountNumber} onChange={(e) => set('accountNumber')(e.target.value.replace(/\D/g, ''))} className={`input ${errors['dr-bank-number'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-bank-number']} />
              </div>
              <div>
                <label htmlFor="dr-bank-ifsc" className="label">IFSC code <span className="text-red-500">*</span></label>
                <input id="dr-bank-ifsc" type="text" maxLength={11} value={form.ifscCode} onChange={(e) => set('ifscCode')(e.target.value.toUpperCase())} placeholder="HDFC0001234" className={`input ${errors['dr-bank-ifsc'] ? 'input-error' : ''}`} />
                <FieldError message={errors['dr-bank-ifsc']} />
              </div>
            </div>
          </section>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting application…' : 'Submit application'}
          </button>

          <p className="text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link href="/delivery/login" className="font-medium text-blue-600 hover:underline">
              Sign in with OTP
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
