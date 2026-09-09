'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { deliveryLoginStart, deliveryLoginSuccess } from '@/store/slices/deliveryAuthSlice';
import { requestDeliveryOtp, verifyDeliveryOtp } from '@/lib/api/delivery';
import { useToast } from '@/components/seller-dashboard/Toast';
import { ErrorNote, FieldError } from '@/components/ui';
import { scrollToField } from '@/lib/utils';
import { IconTruck } from '@/components/icons';

/**
 * Rider login — phone + OTP (backend accepts an Indian mobile with optional
 * +91). No passwords exist for riders; in non-production the login response
 * carries devOtp so testing needs no SMS.
 */
const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

export default function DeliveryLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  // OTP returned by the API in dev — surfaced so nobody digs through logs.
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = phone.trim();
    if (!PHONE_REGEX.test(normalized)) {
      setPhoneError('Enter a valid Indian mobile (e.g. 9876543210 or +919876543210)');
      scrollToField('delivery-login-phone');
      return;
    }
    setPhoneError(null);
    setFormError(null);
    setLoading(true);
    try {
      const result = await requestDeliveryOtp(normalized);
      setDevOtp(result.devOtp ?? null);
      setStep('otp');
      showToast('OTP sent to your phone');
      scrollToField('delivery-login-otp');
    } catch (err) {
      // PENDING/blocked accounts surface here (403 from the backend).
      setFormError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Enter the 6-digit OTP');
      scrollToField('delivery-login-otp');
      return;
    }
    setOtpError(null);
    setFormError(null);
    setLoading(true);
    dispatch(deliveryLoginStart());
    try {
      const session = await verifyDeliveryOtp(phone.trim(), otp.trim());
      dispatch(deliveryLoginSuccess(session));
      showToast(`Welcome back, ${session.deliveryBoy.name}`);
      router.replace('/delivery');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed');
      scrollToField('delivery-login-otp');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <IconTruck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Delivery Partner Login</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your registered phone number — we&apos;ll send a one-time password.
          </p>
        </div>

        <div className="card p-6">
          <ErrorNote message={formError} />

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="delivery-login-phone" className="label">
                  Phone number
                </label>
                <input
                  id="delivery-login-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="9876543210"
                  className={`input ${phoneError ? 'input-error' : ''}`}
                />
                <FieldError message={phoneError} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-slate-600">
                OTP sent to <strong className="text-slate-900">{phone}</strong>.{' '}
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setOtpError(null); }}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Change number
                </button>
              </p>
              {devOtp && (
                <p className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">
                  Dev mode — your OTP is <strong className="font-mono text-base">{devOtp}</strong>
                </p>
              )}
              <div>
                <label htmlFor="delivery-login-otp" className="label">
                  One-time password
                </label>
                <input
                  id="delivery-login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, ''));
                    setOtpError(null);
                  }}
                  placeholder="••••••"
                  className={`input text-center font-mono text-lg tracking-[0.5em] ${otpError ? 'input-error' : ''}`}
                />
                <FieldError message={otpError} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Verifying…' : 'Verify & Sign in'}
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
            New to PrinZex Delivery?{' '}
            <Link href="/delivery/register" className="font-medium text-blue-600 hover:underline">
              Apply as a delivery partner
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
