'use client';

import { useState, type FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminLoginStart, adminLoginSuccess, adminLogout } from '@/store/slices/adminAuthSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import { IconAlertCircle, IconPrinter, IconShieldCheck } from '@/components/icons';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { adminLogin } from '@/lib/api/auth';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const dispatch = useAppDispatch();
  const { admin, status } = useAppSelector((state) => state.adminAuth);

  useEffect(() => {
    if (admin) {
      router.replace(returnUrl || '/admin/dashboard');
    }
  }, [admin, router, returnUrl]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const loading = status === 'loading';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    dispatch(adminLoginStart());
    try {
      const result = await adminLogin({
        email: email.trim(),
        password,
      });

      dispatch(adminLoginSuccess(result));
      router.push(returnUrl || '/admin/dashboard');
    } catch (err: any) {
      dispatch(adminLogout());
      setErrors({ general: err.message || 'Login failed' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <IconPrinter className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            PrinZex <span className="text-slate-400">Admin Portal</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">Internal access only.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {errors.general && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                <IconAlertCircle className="h-4 w-4" />
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="label">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="admin@prinzex.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && (
                <p className="field-error">
                  <IconAlertCircle className="h-3.5 w-3.5" /> {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="admin-password" className="label">
                Password
              </label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={setPassword}
                hasError={Boolean(errors.password)}
              />
              {errors.password && (
                <p className="field-error">
                  <IconAlertCircle className="h-3.5 w-3.5" /> {errors.password}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <IconShieldCheck className="h-3.5 w-3.5" />
          All admin activity is logged and auditable.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="h-96 w-full max-w-md animate-pulse bg-white rounded-2xl" />
    </div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
