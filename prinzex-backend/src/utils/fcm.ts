import { readFileSync } from 'node:fs';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging, type MulticastMessage } from 'firebase-admin/messaging';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { prisma } from '../config/database';

/**
 * FCM push sender (gap #10 — push notifications).
 *
 * The Admin SDK is initialised lazily from a Firebase service account and is
 * a HARD OPTIONAL dependency: without the three FIREBASE_* env vars the whole
 * module degrades to a no-op and every other channel (Mongo notifications,
 * socket `notification:new`, rider polling) keeps working. Sending NEVER
 * throws and NEVER blocks a REST request — notifications are fire-and-forget
 * from the post-commit side-effect runners.
 *
 * Device tokens live in the Prisma `DeviceToken` table, one per device per
 * recipient. `sendPush` fans a message out to every token for
 * (recipientType, recipientId) and prunes tokens FCM reports as invalid
 * (unregistered / wrong project) so dead devices stop costing sends.
 */

export type PushRecipientType = 'customer' | 'seller' | 'delivery_boy';

export interface PushPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  sent: number;
  failed: number;
  removed: number;
  disabled?: boolean;
}

let messaging: Messaging | null = null;
let initAttempted = false;

function resolvePrivateKey(): string {
  if (env.FIREBASE_PRIVATE_KEY_FILE) {
    return readFileSync(env.FIREBASE_PRIVATE_KEY_FILE, 'utf8');
  }
  // Service-account JSON stores the key with literal "\n" escapes; the SDK
  // wants real newlines.
  return env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

/** Initialise the Admin SDK once; returns null when unconfigured/unsafe. */
export function getMessagingOrNull(): Messaging | null {
  if (messaging) return messaging;
  if (initAttempted) return null;
  initAttempted = true;

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !(env.FIREBASE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY_FILE)) {
    logger.info('fcm_unconfigured', {
      message: 'FCM env vars missing — push notifications disabled (in-app + socket + polling unaffected)',
    });
    return null;
  }

  try {
    const app = getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: resolvePrivateKey(),
          }),
        });
    messaging = getMessaging(app);
    logger.info('fcm_initialized', { projectId: env.FIREBASE_PROJECT_ID });
    return messaging;
  } catch (error) {
    logger.error('fcm_init_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function isPushEnabled(): boolean {
  return getMessagingOrNull() !== null;
}

const MAX_TOKENS_PER_SEND = 500; // FCM multicast cap is 500 messages per call.

/** Every non-empty value in `data` coerced to string (FCM webpush rule). */
function stringifyData(data?: Record<string, unknown>): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** FCM "this token can never work again" codes — prune them from the DB. */
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

/**
 * Fan the payload out to every registered device of the recipient. Fire-and-
 * forget: any failure is logged and swallowed, never propagated to the caller.
 */
export async function sendPush(
  recipientType: PushRecipientType,
  recipientId: string,
  payload: PushPayload,
): Promise<PushResult> {
  const client = getMessagingOrNull();
  if (!client) {
    return { sent: 0, failed: 0, removed: 0, disabled: true };
  }

  // `select` narrows to two columns; the explicit type keeps the stale local
  // Prisma client (pre-`generate`) from erasing the shape under noImplicitAny.
  const tokens = (await prisma.deviceToken.findMany({
    where: { recipientType, recipientId },
    select: { id: true, token: true },
    take: MAX_TOKENS_PER_SEND,
  })) as { id: string; token: string }[];
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  const message: MulticastMessage = {
    tokens: tokens.map((row) => row.token),
    notification: { title: payload.title, body: payload.body },
    data: {
      type: payload.type,
      title: payload.title,
      body: payload.body,
      ...stringifyData(payload.data),
    },
    webpush: {
      notification: { title: payload.title, body: payload.body },
      fcmOptions: { link: '/' },
    },
  };

  try {
    const response = await client.sendEachForMulticast(message);
    const deadTokenIds: string[] = [];
    let failed = 0;

    response.responses.forEach((result, index) => {
      if (!result.success) {
        failed += 1;
        const code = result.error?.code ?? '';
        if (INVALID_TOKEN_CODES.has(code) && tokens[index]) {
          deadTokenIds.push(tokens[index].id);
        }
      }
    });

    if (deadTokenIds.length > 0) {
      await prisma.deviceToken
        .deleteMany({ where: { id: { in: deadTokenIds } } })
        .catch(() => {
          /* prune is best-effort */
        });
    }

    return { sent: tokens.length - failed, failed, removed: deadTokenIds.length };
  } catch (error) {
    logger.warn('fcm_send_failed', {
      recipientType,
      recipientId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: 0, failed: tokens.length, removed: 0 };
  }
}

/**
 * Fire-and-forget wrapper for the post-commit notify helpers: swallow every
 * rejection so a push outage can never turn a committed order into a 500.
 */
export function enqueuePush(
  recipientType: PushRecipientType,
  recipientId: string,
  payload: PushPayload,
): void {
  void sendPush(recipientType, recipientId, payload).catch(() => {
    /* sendPush already logs; nothing to do */
  });
}
