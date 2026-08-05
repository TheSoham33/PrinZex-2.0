'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateUser } from '@/store/slices/authSlice';
import { updateProfile } from '@/lib/api/customer';
import { apiRequest } from '@/lib/api/client';
import { IconAlertCircle, IconCheckCircle, IconUser, IconRefreshCw } from '@/components/icons';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [uploading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !hasInitialized) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload photo
      const uploadRes = await apiRequest<{ fileUrl: string }>('/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      // 2. Update profile with new URL
      const updatedUser = await updateProfile({
        avatarUrl: uploadRes.fileUrl,
      });

      dispatch(updateUser(updatedUser));
      setForm((prev) => ({ ...prev, avatarUrl: uploadRes.fileUrl }));
    } catch (err: any) {
      setError(err.message || 'Failed to update profile photo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your personal information.</p>
      </header>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-bold text-white shadow-inner">
              {form.avatarUrl ? (
                <img 
                  src={form.avatarUrl.startsWith('http') ? form.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${form.avatarUrl}`} 
                  key={form.avatarUrl}
                  alt={form.name} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                initials || <IconUser className="h-7 w-7" />
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/40 text-white">
                <IconRefreshCw className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{form.name || 'Your name'}</p>
            <p className="truncate text-sm text-slate-500">{form.email}</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Updating…' : 'Change photo'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

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
              For security and verification reasons, your name, email, and phone number cannot be changed directly. However, you can still update your profile photo above. Please contact PrinZex support if you need to update other details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
