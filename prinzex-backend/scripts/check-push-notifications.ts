/**
 * Guard for the FCM push story (gap #10 — "push notifications channel is a
 * placeholder"). Asserts the full wiring end to end, statically (no Prisma /
 * Firebase runtime needed — the sandbox has no generated Prisma client):
 *
 *   backend  · FCM sender exists (sendPush/enqueuePush), degrades to no-op
 *              without env, and prunes invalid tokens
 *            · DeviceToken model + migration
 *            · /api/devices register/delete endpoints (identity from JWT)
 *            · every existing notify hook fans out to enqueuePush
 *   frontend · firebase SDK init + token mint via the app's service worker
 *            · PushNotificationManager mounted in ClientWrapper
 *            · firebase-messaging-sw.js + its generator script
 *
 * Run from the backend root: npx tsx scripts/check-push-notifications.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKEND = join(__dirname, '..');
const FRONTEND = join(__dirname, '..', '..', 'frontend');
const read = (p: string) => readFileSync(join(BACKEND, p), 'utf8');
const readFrontend = (p: string) => readFileSync(join(FRONTEND, p), 'utf8');

// ── FCM sender (utils/fcm.ts) ─────────────────────────────────────────────
const fcm = read('src/utils/fcm.ts');
assert.ok(fcm.includes('sendEachForMulticast'), 'sender must use FCM multicast');
assert.ok(fcm.includes('enqueuePush'), 'fire-and-forget wrapper required');
assert.ok(fcm.includes('INVALID_TOKEN_CODES'), 'dead-token pruning required');
assert.ok(fcm.includes('getMessagingOrNull'), 'lazy init required');
assert.ok(fcm.includes('FIREBASE_PROJECT_ID'), 'config must key off FIREBASE_* env vars');
assert.ok(!fcm.includes('throw new Error'), 'sender must never throw into a REST request');

// ── DeviceToken model + migration ─────────────────────────────────────────
const schema = read('prisma/schema.prisma');
assert.ok(/model DeviceToken \{/.test(schema), 'DeviceToken model missing from schema');
assert.ok(schema.includes('recipientType String'), 'DeviceToken.recipientType missing');
assert.ok(schema.includes('token         String   @unique'), 'DeviceToken.token must be unique');
const migration = join(BACKEND, 'prisma', 'migrations', '20260913000000_device_tokens', 'migration.sql');
assert.ok(existsSync(migration), 'DeviceToken migration missing');
assert.ok(readFileSync(migration, 'utf8').includes('CREATE TABLE "DeviceToken"'), 'migration must create DeviceToken');

// ── /api/devices register/delete endpoints ────────────────────────────────
const devicesRoutes = read('src/modules/devices/devices.routes.ts');
assert.ok(devicesRoutes.includes("devicesRouter.use(authenticate"), 'device routes must authenticate');
assert.ok(devicesRoutes.includes('registerDeviceBody'), 'register body validation required');
const devicesController = read('src/modules/devices/devices.controller.ts');
assert.ok(devicesController.includes('registerToken'), 'registerToken handler required');
assert.ok(devicesController.includes('user.role ==='), 'recipient identity must come from the JWT');
const appTs = read('src/app.ts');
assert.ok(appTs.includes("app.use('/api/devices', devicesRouter)"), 'devices router not mounted');

// ── every existing notification hook now fans out to FCM ──────────────────
const hookFiles = [
  'src/modules/orders/orders.service.ts',
  'src/modules/seller/seller.service.ts',
  'src/modules/delivery/delivery.service.ts',
  'src/modules/delivery/delivery.assignment.ts',
  'src/modules/payments/payments.service.ts',
  'src/modules/payouts/payouts.service.ts',
  'src/modules/admin/sellers/admin-sellers.service.ts',
  'src/modules/admin/support/admin-support.service.ts',
  'src/modules/admin/users/admin-users.service.ts',
];
for (const file of hookFiles) {
  const src = read(file);
  assert.ok(src.includes('enqueuePush('), `${file} must fan out to enqueuePush`);
}

// ── frontend: SDK init + token mint via the app's service worker ──────────
const push = readFrontend('src/lib/fcm/push.ts');
assert.ok(push.includes("from 'firebase/messaging'"), 'SDK messaging import required');
assert.ok(push.includes('getToken('), 'SDK token mint required');
assert.ok(push.includes('vapidKey'), 'VAPID key must be passed to getToken');
assert.ok(push.includes("'/devices'"), 'token must POST to /api/devices');
assert.ok(push.includes('deleteToken'), 'token revocation on logout required');

const manager = readFrontend('src/lib/fcm/PushNotificationManager.tsx');
assert.ok(manager.includes('requestPushToken'), 'manager must mint a token on login');
assert.ok(manager.includes('registerPushToken'), 'manager must register the token');
assert.ok(manager.includes('deleteCurrentPushToken'), 'manager must revoke on logout');

const wrapper = readFrontend('src/app/ClientWrapper.tsx');
assert.ok(wrapper.includes('PushNotificationManager'), 'manager must be mounted in ClientWrapper');

const swPath = join(FRONTEND, 'public', 'firebase-messaging-sw.js');
assert.ok(existsSync(swPath), 'firebase-messaging-sw.js missing');
const sw = readFileSync(swPath, 'utf8');
assert.ok(sw.includes('onBackgroundMessage'), 'SW must handle background messages');
assert.ok(sw.includes('showNotification'), 'SW must show notifications');
assert.ok(existsSync(join(FRONTEND, 'scripts', 'generate-firebase-sw.ts')), 'SW generator script missing');

// ── graceful degradation: push is OFF without Firebase config ─────────────
const envFile = read('src/config/env.ts');
assert.ok(envFile.includes('FIREBASE_PROJECT_ID'), 'FCM env vars missing from env.ts');
assert.ok(/FIREBASE_(PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY)/.test(read('.env.example')), 'FCM env vars missing from .env.example');

console.log('check-push-notifications: all checks passed ✓');
