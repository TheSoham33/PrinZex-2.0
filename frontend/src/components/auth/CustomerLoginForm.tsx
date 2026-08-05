'use client';

import { useState, type FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginStart, loginSuccess, logout } from '@/store/slices/authSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import { IconAlertCircle, IconCheckCircle } from '@/components/icons';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/seller-types';
import { customerLogin } from '@/lib/api/auth';
import { apiRequest } from '@/lib/api/client';

export default function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  // ... (rest of state)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    
    setErrors({});
    dispatch(loginStart());
    
    try {
      const result = await customerLogin({
        identifier: identifier.trim(),
        password: loginMethod === 'password' ? password : undefined,
        otp: loginMethod === 'otp' ? otp : undefined
      });
      
      dispatch(loginSuccess(result));
      router.push(returnUrl || '/');
    } catch (err: any) {
      dispatch(logout());
      setErrors({ general: err.message || 'Login failed' });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors.general && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4" />
            {errors.general}
          </div>
        )}

        <div>
          <label htmlFor="identifier" className="label">
            {loginMethod === 'password' ? 'Email address' : 'Phone number'}
          </label>
          <div className="relative">
            {loginMethod === 'otp' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
                +91
              </span>
            )}
            <input
              id="identifier"
              type={loginMethod === 'password' ? 'email' : 'tel'}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={loginMethod === 'password' ? 'you@example.com' : '9830012345'}
              autoComplete="username"
              className={`input ${loginMethod === 'otp' ? 'pl-11' : ''} ${errors.identifier ? 'input-error' : ''}`}
            />
          </div>
          {errors.identifier && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.identifier}
            </p>
          )}
        </div>

        {loginMethod === 'password' ? (
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
        ) : (
          <div>
            <label htmlFor="otp" className="label">
              Mobile OTP
            </label>
            <div className="relative">
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                className={`input ${errors.otp ? 'input-error' : ''}`}
                maxLength={6}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || timer > 0}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {sendingOtp ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
            {errors.otp && (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {errors.otp}
              </p>
            )}
            {otpSent && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600">
                <IconCheckCircle className="h-3.5 w-3.5" /> OTP sent
              </p>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing you in…' : 'Log in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
            setIdentifier('');
          }}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {loginMethod === 'password' ? 'Login with mobile' : 'Login with email'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        New to PrinZex?{' '}
        <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
