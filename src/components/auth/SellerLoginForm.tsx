'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { sellerLoginStart, sellerLoginSuccess } from '@/store/slices/sellerAuthSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import { IconAlertCircle, IconStore } from '@/components/icons';
import { EMAIL_REGEX } from '@/lib/seller-types';
import { fakeDelay } from '@/lib/utils';

/** Seller-side login. No social sign-in by design. */
export default function SellerLoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.sellerAuth.status);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loading = status === 'loading';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Business email is required';
    else if (!EMAIL_REGEX.test(email.trim())) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    dispatch(sellerLoginStart());
    await fakeDelay(800);
    dispatch(
      sellerLoginSuccess({
        id: 'seller-1',
        storeName: 'Demo Print Shop',
        ownerName: 'Rajesh Kumar',
        email: email.trim(),
        status: 'approved',
      }),
    );
    router.push('/seller/dashboard');
  };

  return (
    <div>
      <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <IconStore className="mt-0.5 h-4 w-4 shrink-0" />
        Sign in to manage orders, inventory and payouts for your print shop.
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="seller-email" className="label">
            Business email
          </label>
          <input
            id="seller-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@yourshop.in"
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
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="seller-password" className="label mb-0">
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
            id="seller-password"
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
          {loading ? 'Signing you in…' : 'Log in as seller'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&apos;t have a store yet?{' '}
        <Link href="/seller/register" className="font-semibold text-blue-600 hover:text-blue-700">
          Register your store
        </Link>
      </p>

      <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        Demo build — any valid email and a 6+ character password signs you in as an approved seller.
      </p>
    </div>
  );
}
