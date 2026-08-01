'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginStart, loginSuccess } from '@/store/slices/authSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import AuthDivider from '@/components/auth/AuthDivider';
import SocialLoginButton from '@/components/auth/SocialLoginButton';
import { IconAlertCircle, IconPrinter } from '@/components/icons';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/seller-types';
import { fakeDelay } from '@/lib/utils';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreed: false,
};

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const loading = status === 'loading';
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    else if (form.fullName.trim().length < 3) next.fullName = 'Please enter your full name';

    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email address';

    if (!form.phone.trim()) next.phone = 'Phone number is required';
    else if (!PHONE_REGEX.test(form.phone.replace(/\D/g, '').slice(-10)))
      next.phone = 'Enter a valid 10-digit Indian mobile number';

    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters';

    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match';

    if (!form.agreed) next.agreed = 'Please accept the terms to continue';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    dispatch(loginStart());
    await fakeDelay(800);
    dispatch(
      loginSuccess({ id: 'user-new', name: form.fullName.trim(), email: form.email.trim() }),
    );
    router.push('/verify-email');
  };

  return (
    <div>
      <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <IconPrinter className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-slate-900">
          Prin<span className="text-blue-600">Zex</span>
        </span>
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Free forever. No subscription, pay only for what you print.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="label">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            placeholder="Ananya Sen"
            autoComplete="name"
            className={`input ${errors.fullName ? 'input-error' : ''}`}
          />
          {errors.fullName && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
          />
          {errors.email && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone number
          </label>
          <div className="flex gap-2">
            <span className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
              +91
            </span>
            <div className="flex-1">
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="9830012345"
                autoComplete="tel"
                className={`input ${errors.phone ? 'input-error' : ''}`}
              />
            </div>
          </div>
          {errors.phone && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(value) => update('password', value)}
            autoComplete="new-password"
            hasError={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.password}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">At least 8 characters</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={form.confirmPassword}
            onChange={(value) => update('confirmPassword', value)}
            autoComplete="new-password"
            hasError={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.confirmPassword}
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(event) => update('agreed', event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
            />
            <span>
              I agree to the <span className="font-medium text-blue-600">Terms of Service</span> and{' '}
              <span className="font-medium text-blue-600">Privacy Policy</span>
            </span>
          </label>
          {errors.agreed && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.agreed}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      <AuthDivider />

      <SocialLoginButton
        disabled={loading}
        label="Sign up with Google"
        onClick={async () => {
          dispatch(loginStart());
          await fakeDelay();
          dispatch(
            loginSuccess({ id: 'user-g', name: 'Ananya Sen', email: 'ananya.sen@gmail.com' }),
          );
          router.push('/');
        }}
      />

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
