'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IconAlertCircle, IconArrowLeft, IconMailCheck, IconPrinter } from '@/components/icons';
import { EMAIL_REGEX } from '@/lib/seller-types';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    setSending(true);
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <IconMailCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-600">
          If an account exists for <span className="font-medium text-slate-900">{email}</span>,
          we&apos;ve sent a password reset link. It expires in 30 minutes.
        </p>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="btn-secondary mt-6 w-full"
        >
          Use a different email
        </button>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <IconArrowLeft className="h-4 w-4" /> Back to login
        </Link>
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
        Enter the email linked to your account and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={`input ${error ? 'input-error' : ''}`}
          />
          {error && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>

        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? 'Sending link…' : 'Send reset link'}
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
