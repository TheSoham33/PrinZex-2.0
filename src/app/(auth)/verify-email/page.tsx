'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { IconAlertCircle, IconCheckCircle, IconMailCheck } from '@/components/icons';

const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '');
    if (!value) return;

    const next = [...digits];
    // Support pasting the whole code into any box.
    value.split('').forEach((char, offset) => {
      if (index + offset < OTP_LENGTH) next[index + offset] = char;
    });
    setDigits(next);
    setError(null);

    const focusIndex = Math.min(index + value.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        next[index - 1] = '';
        setDigits(next);
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits`);
      return;
    }
    setVerifying(true);
    setVerifying(false);
    setVerified(true);
    setTimeout(() => router.push('/dashboard'), 1400);
  };

  if (verified) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <IconCheckCircle className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Email verified</h1>
        <p className="mt-2 text-sm text-slate-600">
          You&apos;re all set. Taking you to your dashboard…
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <IconMailCheck className="h-7 w-7" />
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Verify your email
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        We sent a {OTP_LENGTH}-digit code to{' '}
        <span className="font-medium text-slate-900">{user?.email ?? 'your email address'}</span>.
      </p>

      <div className="mt-8">
        <div className="flex gap-2 sm:gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              value={digit}
              onChange={(event) => handleChange(index, event)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              aria-label={`Digit ${index + 1}`}
              className={`h-14 w-full rounded-xl border text-center text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="field-error">
            <IconAlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="btn-primary mt-6 w-full"
        >
          {verifying ? 'Verifying…' : 'Verify email'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Didn&apos;t get the code?{' '}
          {cooldown > 0 ? (
            <span className="text-slate-400">Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={() => setCooldown(30)}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Resend code
            </button>
          )}
        </p>

        <p className="mt-6 text-center text-sm">
          <Link href="/dashboard" className="font-semibold text-slate-500 hover:text-slate-700">
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  );
}
