'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  adminLoginStart,
  adminLoginSuccess,
  adminLoginFailure,
  buildAdmin,
  ROLE_LABELS,
  type AdminRole,
} from '@/store/slices/adminAuthSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import { IconAlertCircle, IconPrinter, IconShieldCheck } from '@/components/icons';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { login } from '@/lib/api/auth';

const ROLES: AdminRole[] = [
  'super_admin',
  'ops_manager',
  'support_agent',
  'finance_manager',
  'content_manager',
];

export default function AdminLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.adminAuth.status);

  const [role, setRole] = useState<AdminRole>('super_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
      const result = await login(email.trim(), password, 'admin');
      dispatch(
        adminLoginSuccess(
          buildAdmin(role, {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
          }),
        ),
      );
      router.push('/admin/dashboard');
    } catch (err) {
      dispatch(adminLoginFailure());
      setErrors({
        password:
          err instanceof Error && err.message ? err.message : 'Unable to sign you in. Try again.',
      });
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label htmlFor="admin-role" className="label">
                Admin role
              </label>
              <select
                id="admin-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
                aria-describedby="role-hint"
                className="input"
              >
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </option>
                ))}
              </select>
              <p id="role-hint" className="mt-2 text-xs text-slate-500">
                The role determines which admin sections you can view.
              </p>
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
