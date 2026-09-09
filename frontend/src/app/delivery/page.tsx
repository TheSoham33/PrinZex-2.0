'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateDeliveryBoy } from '@/store/slices/deliveryAuthSlice';
import {
  confirmDeliveryDone,
  confirmDeliveryPickup,
  failActiveDelivery,
  fetchActiveDelivery,
  fetchDeliveryEarnings,
  fetchDeliveryProfile,
  pingDeliveryLocation,
  setDeliveryAvailability,
  type ActiveDelivery,
} from '@/lib/api/delivery';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import StatCard from '@/components/seller-dashboard/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { useToast } from '@/components/seller-dashboard/Toast';
import { FieldError } from '@/components/ui';
import { formatCurrency, scrollToField } from '@/lib/utils';
import {
  IconAlertCircle,
  IconClock,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconTruck,
  IconWallet,
} from '@/components/icons';

/** Seconds between GPS pings while a delivery is active. */
const GPS_PING_INTERVAL_MS = 60_000;

export default function DeliveryDashboardPage() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const deliveryBoy = useAppSelector((state) => state.deliveryAuth.deliveryBoy);

  const profileQ = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: fetchDeliveryProfile,
  });

  // The backend 404s when there is no active delivery — the data stays
  // undefined, which the UI treats as the idle state, not an error screen.
  const activeQ = useQuery({
    queryKey: ['delivery-active'],
    queryFn: fetchActiveDelivery,
    retry: false,
    refetchInterval: 30_000,
  });
  const active: ActiveDelivery | null = activeQ.data ?? null;

  const earningsQ = useQuery({
    queryKey: ['delivery-earnings', '7d'],
    queryFn: () => fetchDeliveryEarnings('7d'),
  });

  // ── Availability toggle ────────────────────────────────────────────────
  const availabilityM = useMutation({
    mutationFn: setDeliveryAvailability,
    onSuccess: (result) => {
      dispatch(updateDeliveryBoy({ isOnline: result.isOnline }));
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      showToast(result.isOnline ? 'You are online — new deliveries can be assigned' : 'You are offline');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
  // Server profile is the source of truth; the slice mirrors it at login.
  const isOnline = profileQ.data?.isOnline ?? deliveryBoy?.isOnline ?? false;

  // ── Active-delivery actions ────────────────────────────────────────────
  const invalidateActive = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-earnings'] });
  };

  const pickupM = useMutation({
    mutationFn: confirmDeliveryPickup,
    onSuccess: () => {
      showToast('Pickup confirmed — head to the customer');
      invalidateActive();
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const [deliverOtp, setDeliverOtp] = useState('');
  const [deliverOtpError, setDeliverOtpError] = useState<string | null>(null);
  const deliverM = useMutation({
    mutationFn: confirmDeliveryDone,
    onSuccess: (result) => {
      showToast(`Delivered — ${formatCurrency(result.earned)} added to your earnings`);
      setDeliverOtp('');
      invalidateActive();
    },
    onError: (err: Error) => {
      setDeliverOtpError(err.message);
      scrollToField('delivery-otp');
    },
  });
  const handleDeliver = () => {
    if (!/^\d{4}$/.test(deliverOtp.trim())) {
      setDeliverOtpError('Ask the customer for the 4-digit delivery OTP');
      scrollToField('delivery-otp');
      return;
    }
    setDeliverOtpError(null);
    deliverM.mutate(deliverOtp.trim());
  };

  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [failReasonError, setFailReasonError] = useState<string | null>(null);
  const failM = useMutation({
    mutationFn: failActiveDelivery,
    onSuccess: () => {
      showToast('Delivery marked as failed — the order goes back to the store');
      setFailOpen(false);
      setFailReason('');
      invalidateActive();
    },
    onError: (err: Error) => {
      setFailReasonError(err.message);
      scrollToField('delivery-fail-reason');
    },
  });
  const handleFail = () => {
    if (failReason.trim().length < 3) {
      setFailReasonError('Give a short failure reason');
      scrollToField('delivery-fail-reason');
      return;
    }
    setFailReasonError(null);
    failM.mutate(failReason.trim());
  };

  // ── GPS: ping the backend every minute while a delivery is active ──────
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          pingDeliveryLocation(position.coords.latitude, position.coords.longitude)
            .then((result) => { if (!cancelled) setEtaMinutes(result.etaMinutes); })
            .catch(() => { /* keep the dashboard quiet — GPS is best-effort */ });
        },
        () => { /* permission denied — skip silently */ },
        { maximumAge: 30_000 },
      );
    };
    ping();
    const timer = setInterval(ping, GPS_PING_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const awaitingPickup = active?.status === 'assigned';
  const delivering = active?.status === 'picked_up' || active?.status === 'out_for_delivery';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hi, {deliveryBoy?.name?.split(' ')[0] ?? 'Partner'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {profileQ.data ? (
              <>
                ★ {profileQ.data.averageRating.toFixed(1)} · {profileQ.data.totalDeliveries} deliveries ·{' '}
                {profileQ.data.onTimeRate}% on time
              </>
            ) : (
              'Loading your profile…'
            )}
          </p>
        </div>
        {profileQ.data && <StatusBadge status={profileQ.data.status.toLowerCase()} />}
      </header>

      {/* Availability */}
      <section className="card flex items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            You are {isOnline ? 'ONLINE' : 'OFFLINE'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {isOnline
              ? 'New deliveries can be auto-assigned to you.'
              : 'Go online to start receiving deliveries.'}
          </p>
        </div>
        <ToggleSwitch
          checked={isOnline}
          onChange={(value) => availabilityM.mutate(value)}
          label="Availability"
          hideLabel
        />
      </section>

      {/* Active delivery */}
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Active delivery</h2>
          {etaMinutes !== null && active && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <IconClock className="h-3.5 w-3.5" /> ~{etaMinutes} min to drop
            </span>
          )}
        </div>

        {!active ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <IconPackage className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No active delivery right now.{' '}
              {isOnline ? 'Hang tight — the next one drops here automatically.' : 'Go online to receive deliveries.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Route */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <IconMapPin className="h-3.5 w-3.5" /> Pickup
                </p>
                <p className="mt-1.5 font-semibold text-slate-900">{active.pickup.storeName}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {active.pickup.address}, {active.pickup.city} — {active.pickup.pincode}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                  <IconPhone className="h-3 w-3" /> {active.pickup.phone}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <IconMapPin className="h-3.5 w-3.5" /> Drop
                </p>
                <p className="mt-1.5 font-semibold text-slate-900">{active.customer.name}</p>
                {active.drop ? (
                  <>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {active.drop.fullAddress}, {active.drop.city}, {active.drop.state} — {active.drop.pincode}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <IconPhone className="h-3 w-3" /> {active.drop.phone}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-500">Address unavailable</p>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {active.order.services.map((serviceName) => (
                    <p key={serviceName} className="truncate text-slate-700">{serviceName}</p>
                  ))}
                  {active.order.specialInstructions && (
                    <p className="mt-1 text-xs text-slate-500">Note: {active.order.specialInstructions}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatCurrency(active.order.total)}</p>
                  {active.order.paymentMethod === 'cod' && (
                    <p className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <IconAlertCircle className="h-3 w-3" /> Collect cash
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions follow the delivery state, nothing hardcoded */}
            {awaitingPickup && (
              <button
                type="button"
                onClick={() => pickupM.mutate()}
                disabled={pickupM.isPending}
                className="btn-primary w-full"
              >
                <IconTruck className="h-4 w-4" />
                {pickupM.isPending ? 'Confirming…' : 'Confirm pickup from store'}
              </button>
            )}

            {delivering && !failOpen && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="delivery-otp" className="label">
                    Customer delivery OTP (4 digits)
                  </label>
                  <input
                    id="delivery-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={deliverOtp}
                    onChange={(event) => {
                      setDeliverOtp(event.target.value.replace(/\D/g, ''));
                      setDeliverOtpError(null);
                    }}
                    placeholder="••••"
                    className={`input text-center font-mono text-lg tracking-[0.5em] ${deliverOtpError ? 'input-error' : ''}`}
                  />
                  <FieldError message={deliverOtpError} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleDeliver}
                    disabled={deliverM.isPending}
                    className="btn-primary"
                  >
                    {deliverM.isPending ? 'Completing…' : 'Mark delivered'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailOpen(true)}
                    className="btn-secondary text-red-600"
                  >
                    Can&apos;t deliver?
                  </button>
                </div>
              </div>
            )}

            {delivering && failOpen && (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
                <div>
                  <label htmlFor="delivery-fail-reason" className="label">
                    Why couldn&apos;t this be delivered?
                  </label>
                  <textarea
                    id="delivery-fail-reason"
                    rows={2}
                    value={failReason}
                    onChange={(event) => {
                      setFailReason(event.target.value);
                      setFailReasonError(null);
                    }}
                    placeholder="e.g. Customer unreachable, wrong address"
                    className={`input resize-none ${failReasonError ? 'input-error' : ''}`}
                  />
                  <FieldError message={failReasonError} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleFail}
                    disabled={failM.isPending}
                    className="btn-primary bg-red-600 hover:bg-red-700"
                  >
                    {failM.isPending ? 'Reporting…' : 'Report failed delivery'}
                  </button>
                  <button type="button" onClick={() => setFailOpen(false)} className="btn-secondary">
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Earnings strip (7 days) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Last 7 days</h2>
          <Link href="/delivery/earnings" className="text-sm font-medium text-blue-600 hover:underline">
            View earnings & payouts
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Earnings"
            value={earningsQ.isLoading ? '…' : formatCurrency(earningsQ.data?.totalEarnings ?? 0)}
            icon={IconWallet}
            iconClass="bg-green-100 text-green-600"
          />
          <StatCard
            label="Deliveries"
            value={earningsQ.isLoading ? '…' : String(earningsQ.data?.deliveryCount ?? 0)}
            icon={IconPackage}
            iconClass="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Pending payout"
            value={earningsQ.isLoading ? '…' : formatCurrency(earningsQ.data?.pendingEarnings ?? 0)}
            icon={IconClock}
            iconClass="bg-amber-100 text-amber-600"
          />
        </div>
      </section>
    </div>
  );
}
