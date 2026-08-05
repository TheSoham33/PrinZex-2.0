'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { IconUser } from '@/components/icons';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (user && !hasInitialized) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  const initials = form.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="name" className="label text-slate-500">Full name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              readOnly
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
            />
          </div>

          <div>
            <label htmlFor="email" className="label text-slate-500">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              readOnly
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
            />
          </div>

          <div>
            <label htmlFor="phone" className="label text-slate-500">Phone number</label>
            <div className="flex gap-2">
              <span className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400">
                +91
              </span>
              <div className="flex-1">
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  readOnly
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold flex items-center gap-2">
              Account information is locked
            </p>
            <p className="mt-1">
              For security and verification reasons, your name, email, and phone number cannot be changed directly. Please contact PrinZex support if you need to update these details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
