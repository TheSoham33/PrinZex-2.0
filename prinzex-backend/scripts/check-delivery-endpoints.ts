/**
 * Guard for the rider app's "quiet idle" contract — two states that used to
 * surface as red console errors on every session:
 *
 *   GET /api/delivery/active-delivery   → 200 + null when the rider has no
 *       active delivery (the dashboard polls every 30s; idle is not an error)
 *   POST /api/delivery/auth/logout      → unauthenticated + idempotent 200,
 *       because the client fires it while cleaning up a session whose access
 *       token may already be expired; the refresh token is revoked by value
 *
 * The mutation paths (location ping, pickup, deliver, fail) must KEEP the
 * throwing finder — they genuinely require an active delivery.
 *
 * Run: npx tsx scripts/check-delivery-endpoints.ts   (from prinzex-backend)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const routes = read('src/modules/delivery-auth/delivery-auth.routes.ts');
const ctrl = read('src/modules/delivery-auth/delivery-auth.controller.ts');
const authService = read('src/modules/delivery-auth/delivery-auth.service.ts');
const service = read('src/modules/delivery/delivery.service.ts');

// ── logout route: no session gate ────────────────────────────────────────
const logoutRoute = routes.slice(routes.indexOf("'/logout'"), routes.indexOf("'/refresh'"));
assert.ok(logoutRoute.length > 0, 'could not locate the logout route');
assert.ok(!logoutRoute.includes('authenticate'), 'logout route must not require authenticate');
assert.ok(!logoutRoute.includes('authorizeRoles'), 'logout route must not require a role');

// ── logout controller/service: never 401, revoke by token value ───────────
const logoutCtrl = ctrl.slice(ctrl.indexOf('export const logout'), ctrl.indexOf('export const refresh'));
assert.ok(!logoutCtrl.includes('unauthorized'), 'logout controller must not throw 401');
assert.ok(!logoutCtrl.includes('req.user'), 'logout controller must not need a session');

const logoutSvc = authService.slice(authService.indexOf('export async function logout'));
assert.ok(logoutSvc.includes('updateMany'), 'logout must revoke the presented refresh token');
assert.ok(!logoutSvc.includes('blacklistAccessToken('), 'logout has no access token to blacklist');

// ── active delivery: nullable read path, throwing mutation paths ──────────
const getBlock = service.slice(
  service.indexOf('export async function getActiveDelivery'),
  service.indexOf('export async function', service.indexOf('export async function getActiveDelivery') + 10),
);
assert.ok(getBlock.includes('findActiveDelivery(deliveryBoyId)'), 'GET path must use the nullable finder');
assert.ok(!getBlock.includes('findActiveDeliveryOrThrow'), 'GET path must not 404 on idle');
assert.ok(getBlock.includes('return null'), 'GET path must return 200 + null when idle');

const mutationCalls = service.match(/findActiveDeliveryOrThrow\(deliveryBoyId\)/g) ?? [];
assert.equal(
  mutationCalls.length,
  4,
  'location ping, pickup, deliver and fail must keep the throwing finder',
);

console.log('OK: active-delivery reads stay 200 when idle; logout is an idempotent 200.');
