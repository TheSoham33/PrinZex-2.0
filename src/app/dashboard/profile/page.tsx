'use client';

import { useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginSuccess } from '@/store/slices/authSlice';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/seller-types';
import { fakeDelay } from '@/lib/utils';
import { IconAlertCircle, IconCheckCircle, IconUser } from '@/components/icons';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '9830045612',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = form.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};

    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!PHONE_REGEX.test(form.phone.replace(/\D/g, '').slice(-10)))
      next.phone = 'Enter a valid 10-digit mobile number';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    await fakeDelay(700);
    dispatch(
      loginSuccess({ id: user?.id ?? 'user-1', name: form.name.trim(), email: form.email.trim() }),
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your personal information.</p>
      </header>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {initials || <IconUser className="h-7 w-7" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{form.name || 'Your name'}</p>
            <p className="truncate text-sm text-slate-500">{form.email}</p>
            <button type="button" className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
              Change photo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {saved && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              <IconCheckCircle className="h-4 w-4 shrink-0" /> Profile updated successfully
            </p>
          )}

          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={`input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && (
              <p className="field-error"><IconAlertCircle className="h-3.5 w-3.5" /> {errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={`input ${errors.email ? 'input-error' : ''}`}
            />
            {errors.email && (
              <p className="field-error"><IconAlertCircle className="h-3.5 w-3.5" /> {errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="label">Phone number</label>
            <div className="flex gap-2">
              <span className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                +91
              </span>
              <div className="flex-1">
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className={`input ${errors.phone ? 'input-error' : ''}`}
                />
              </div>
            </div>
            {errors.phone && (
              <p className="field-error"><IconAlertCircle className="h-3.5 w-3.5" /> {errors.phone}</p>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
