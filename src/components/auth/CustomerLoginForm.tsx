'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginStart, loginSuccess } from '@/store/slices/authSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import AuthDivider from '@/components/auth/AuthDivider';
import SocialLoginButton from '@/components/auth/SocialLoginButton';
import { IconAlertCircle } from '@/components/icons';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/seller-types';
import { fakeDelay } from '@/lib/utils';

/** The original customer login form, unchanged in behaviour. */
export default function CustomerLoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const loading = status === 'loading';

  const validate = () => {
    const next: typeof errors = {};
    const value = identifier.trim();

    if (!value) {
      next.identifier = 'Email or phone number is required';
    } else if (!EMAIL_REGEX.test(value) && !PHONE_REGEX.test(value.replace(/\D/g, '').slice(-10))) {
      next.identifier = 'Enter a valid email or 10-digit mobile number';
    }

    if (!password) {
      next.password = 'Password is required';
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const signIn = async (name: string, email: string) => {
    dispatch(loginStart());
    await fakeDelay();
    dispatch(loginSuccess({ id: 'user-1', name, email }));
    router.push('/');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const value = identifier.trim();
    const email = EMAIL_REGEX.test(value) ? value : `${value.replace(/\D/g, '')}@prinzex.in`;
    await signIn('Ananya Sen', email);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="identifier" className="label">
            Email or phone
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            className={`input ${errors.identifier ? 'input-error' : ''}`}
          />
          {errors.identifier && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.identifier}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
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
          {loading ? 'Signing you in…' : 'Log in'}
        </button>
      </form>

      <AuthDivider />

      <SocialLoginButton
        disabled={loading}
        onClick={() => signIn('Ananya Sen', 'ananya.sen@gmail.com')}
      />

      <p className="mt-8 text-center text-sm text-slate-600">
        New to PrinZex?{' '}
        <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
          Create an account
        </Link>
      </p>

      <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        Demo build — any valid-looking email and a 6+ character password will sign you in.
      </p>
    </div>
  );
}
