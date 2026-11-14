import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { apiRequest } from '@/lib/api/client';
import { extractFirebaseConfig, isFirebaseConfigured } from './config';

/**
 * FCM browser client (gap #10). Every helper is a safe no-op when Firebase
 * isn't configured (NEXT_PUBLIC_FIREBASE_CONFIG / NEXT_PUBLIC_FCM_VAPID_KEY
 * empty), the browser blocks notifications, or the service worker is
 * unavailable — push is an enhancement on top of in-app + socket channels.
 */

export interface PushMessage {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let initAttempted = false;
let currentToken: string | null = null;

function webConfig() {
  return {
    config: extractFirebaseConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG),
    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY ?? '',
  };
}

/** The browser must be able to run a service worker and show notifications. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

function messagingInstance(): Messaging | null {
  if (messaging) return messaging;
  if (initAttempted) return null;
  initAttempted = true;

  const { config, vapidKey } = webConfig();
  if (!isFirebaseConfigured(config) || !vapidKey) return null;

  try {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

/**
 * Ask for notification permission and mint/refresh an FCM registration token,
 * using the app's own service worker (public/firebase-messaging-sw.js). Safe
 * to call before sign-in is fully resolved — returns null when unusable.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const m = messagingInstance();
  if (!m) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const { vapidKey } = webConfig();
    const registration = await navigator.serviceWorker.ready;
    // firebase v12 accepts the VAPID key directly as its base64url string.
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: registration });
    currentToken = token;
    return token;
  } catch {
    return null;
  }
}

/** Subscribe to foreground messages (tab open) — returns an unsubscribe. */
export function onPushMessage(callback: (payload: PushMessage) => void): () => void {
  const m = messagingInstance();
  if (!m) return () => {};
  return onMessage(m, (payload) => {
    callback({
      type: typeof payload.data?.type === 'string' ? payload.data.type : undefined,
      title: payload.notification?.title ?? payload.data?.title,
      body: payload.notification?.body ?? payload.data?.body,
      data: payload.data ?? undefined,
    });
  });
}

/** Persist the minted token against the signed-in identity (POST /api/devices). */
export async function registerPushToken(token: string): Promise<void> {
  await apiRequest('/devices', {
    method: 'POST',
    body: JSON.stringify({ token, platform: 'web' }),
  });
}

/** Remove one token from the registry (permission revoked / token swap). */
export async function unregisterPushToken(token: string): Promise<void> {
  await apiRequest('/devices', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

/** Revoke the current token on FCM and clear the server row (logout path). */
export async function deleteCurrentPushToken(): Promise<void> {
  const m = messagingInstance();
  const token = currentToken;
  currentToken = null;
  if (!m || !token) return;
  try {
    await deleteToken(m);
    await unregisterPushToken(token);
  } catch {
    /* best-effort: an orphaned token is pruned by the sender on first failure */
  }
}
