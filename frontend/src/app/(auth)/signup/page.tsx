'use client';

import { useState, type FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginStart, loginSuccess, logout } from '@/store/slices/authSlice';
import PasswordInput from '@/components/auth/PasswordInput';
import { IconAlertCircle, IconPrinter, IconCheckCircle } from '@/components/icons';
import { EMAIL_REGEX, PHONE_REGEX } from '@/lib/seller-types';
import { customerRegister } from '@/lib/api/auth';
import { apiRequest } from '@/lib/api/client';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  otp: string;
  agreed: boolean;
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  otp: '',
  agreed: false,
};

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>> & { general?: string }>({});
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [timer, setTimer] = useState(0);

  const loading = status === 'loading';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email address';

    if (!form.phone.trim()) next.phone = 'Phone number is required';
    else if (!PHONE_REGEX.test(form.phone.replace(/\D/g, '').slice(-10)))
      next.phone = 'Enter a valid 10-digit Indian mobile number';

    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters';

    if (!form.agreed) next.agreed = 'Please accept the terms to continue';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendOtp = async () => {
    if (!PHONE_REGEX.test(form.phone.replace(/\D/g, '').slice(-10))) {
      setErrors({ phone: 'Enter a valid 10-digit mobile number' });
      return;
    }
    
    setSendingOtp(true);
    setErrors({});
    try {
      await apiRequest('/auth/send-signup-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.phone.trim() }),
      });
      setOtpSent(true);
      setTimer(60); // Start 60s timer
      showToast('OTP sent to your phone');
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to send OTP' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setErrors({});
    dispatch(loginStart());
    
    try {
      const result = await customerRegister({
        name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        otp: form.otp || undefined // Send undefined if empty to pass Zod validation
      });
      
      dispatch(loginSuccess(result));
      router.push('/');
    } catch (err: any) {
      dispatch(logout());
      setErrors({ general: err.message || 'Signup failed' });
    }
  };

  const showToast = (msg: string) => {
    // Stub for toast notification
    console.log(msg);
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
        {errors.general && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4" />
            {errors.general}
          </div>
        )}

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
            <div className="flex-1 relative">
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="9830012345"
                autoComplete="tel"
                className={`input ${errors.phone ? 'input-error' : ''}`}
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
          </div>
          {errors.phone && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.phone}
            </p>
          )}
          {otpSent && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600">
              <IconCheckCircle className="h-3.5 w-3.5" /> OTP sent to your phone
            </p>
          )}
        </div>

        <div>
          <label htmlFor="otp" className="label">
            Phone OTP
          </label>
          <input
            id="otp"
            type="text"
            value={form.otp}
            onChange={(event) => update('otp', event.target.value)}
            placeholder="6-digit code"
            className={`input ${errors.otp ? 'input-error' : ''}`}
            maxLength={6}
          />
          {errors.otp && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.otp}
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

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
