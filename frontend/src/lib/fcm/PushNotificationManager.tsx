'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useToast } from '@/components/seller-dashboard/Toast';
import { deleteCurrentPushToken, onPushMessage, requestPushToken, registerPushToken } from './push';

/**
 * FCM push registration + foreground handling (gap #10).
 *
 * Mounted once in ClientWrapper, it watches the signed-in identity across all
 * four lanes and, on a login, mints an FCM token and POSTs it to
 * /api/devices; on logout it revokes the token. Foreground messages (tab
 * open) surface as a toast + window focus — background messages are shown by
 * public/firebase-messaging-sw.js. Every step is a no-op without permission
 * or Firebase config, so this component is invisible when push is off.
 */

/** Stable identity key so a re-render never re-registers the same device. */
function identityOf(state: {
  customerId: string | null;
  sellerId: string | null;
  riderId: string | null;
}): string | null {
  if (state.customerId) return `customer:${state.customerId}`;
  if (state.sellerId) return `seller:${state.sellerId}`;
  if (state.riderId) return `delivery_boy:${state.riderId}`;
  return null;
}

export default function PushNotificationManager() {
  const customerId = useAppSelector((s) => s.auth.user?.id ?? null);
  const sellerId = useAppSelector((s) => s.sellerAuth.seller?.id ?? null);
  const riderId = useAppSelector((s) => s.deliveryAuth.deliveryBoy?.id ?? null);
  const { showToast } = useToast();

  const identity = identityOf({ customerId, sellerId, riderId });
  const lastIdentity = useRef<string | null | undefined>(undefined);

  // Register / revoke the device token as the signed-in identity changes.
  useEffect(() => {
    if (lastIdentity.current === identity) return;
    lastIdentity.current = identity;

    if (!identity) {
      void deleteCurrentPushToken();
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await requestPushToken();
      if (cancelled || !token) return;
      try {
        await registerPushToken(token);
      } catch {
        // Push is an enhancement — a failed registration never breaks the UI.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity]);

  // Foreground messages: toast + focus, mirroring the in-app notification UX.
  useEffect(() => {
    return onPushMessage((message) => {
      const text =
        message.title && message.body ? `${message.title} — ${message.body}` : message.body ?? message.title ?? 'New update';
      showToast(text);
      try {
        window.focus();
      } catch {
        /* focus is best-effort */
      }
    });
  }, [showToast]);

  return null;
}
