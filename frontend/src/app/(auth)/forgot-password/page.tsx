'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconArrowLeft, IconCheckCircle, IconMailCheck, IconPrinter } from '@/components/icons';
import PasswordInput from '@/components/auth/PasswordInput';
import { forgotPassword, resetPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'resetting' | 'success'>('idle');

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Email or phone is required');
      return;
    }
    setError(null);
    setStatus('sending');
    try {
      await forgotPassword(identifier.trim());
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
      setStatus('idle');
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!otp.trim()) {
      setError('OTP is required');
      return;
    }
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    setError(null);
    setStatus('resetting');
    try {
      await resetPassword({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword
      });
      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      setStatus('sent');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <IconCheckCircle className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Password reset</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your password has been successfully updated. You can now log in with your new password.
        </p>

        <Link href="/login" className="btn-primary mt-8 block w-full text-center">
          Log in now
        </Link>
      </div>
    );
  }

  if (status === 'sent' || status === 'resetting') {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Enter reset code
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ve sent a 6-digit code to <span className="font-semibold text-slate-900">{identifier}</span>.
        </p>

        <form onSubmit={handleResetPassword} noValidate className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
              <IconAlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="otp" className="label">
              6-digit OTP
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="000000"
              maxLength={6}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="label">
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
            />
          </div>

          <button type="submit" disabled={status === 'resetting'} className="btn-primary w-full">
            {status === 'resetting' ? 'Resetting…' : 'Update password'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <IconArrowLeft className="h-4 w-4" /> Use a different email/phone
        </button>
      </div>
    );
  }

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
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter your email or phone number and we&apos;ll send you a reset code.
      </p>

      <form onSubmit={handleSendOtp} noValidate className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="identifier" className="label">
            Email or Phone
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com or 9830012345"
            className="input"
          />
        </div>

        <button type="submit" disabled={status === 'sending'} className="btn-primary w-full">
          {status === 'sending' ? 'Sending code…' : 'Send reset code'}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <IconArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </div>
  );
}
