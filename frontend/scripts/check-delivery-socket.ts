/**
 * Guard for the rider assignment cue (gap #6 — Socket.io push + sound/toast
 * cue, polling kept as fallback):
 *
 *   · `socket.io-client` is a declared frontend dependency
 *   · the frontend event constant is the spec literal `delivery.assigned`
 *     (must match the backend's RT_EVENTS.DELIVERY_ASSIGNED)
 *   · the rider app listens on that event, plays a chime, fires a toast and
 *     invalidates the active-delivery query on arrival
 *   · the listener is mounted in the rider layout (active on every rider page)
 *   · the dashboard STILL polls every 30s (fallback — not replaced)
 *
 * Run from the frontend root: npx tsx scripts/check-delivery-socket.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DELIVERY_ASSIGNED_EVENT } from '../src/lib/realtime/deliverySocket';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

// ── dependency declared ───────────────────────────────────────────────────
const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
assert.ok(pkg.dependencies['socket.io-client'], 'socket.io-client must be a frontend dependency');

// ── event name matches the backend emitter ────────────────────────────────
assert.equal(
  DELIVERY_ASSIGNED_EVENT,
  'delivery.assigned',
  'frontend must listen for the spec literal `delivery.assigned`',
);

// ── the listener does sound + toast + immediate refetch ───────────────────
const listener = read('src/app/delivery/DeliveryAssignmentListener.tsx');
assert.ok(listener.includes(`socket.on(DELIVERY_ASSIGNED_EVENT`), 'must subscribe to delivery.assigned');
assert.ok(listener.includes('playAssignmentChime()'), 'assignment must play the chime');
assert.ok(listener.includes('showToast('), 'assignment must fire a toast');
assert.ok(
  listener.includes("invalidateQueries({ queryKey: ['delivery-active'] })"),
  'assignment must invalidate the active-delivery query for an immediate refetch',
);

// ── mounted in the rider layout ───────────────────────────────────────────
const layout = read('src/app/delivery/layout.tsx');
assert.ok(layout.includes('DeliveryAssignmentListener'), 'the listener must be mounted in the rider layout');

// ── polling remains as the fallback ───────────────────────────────────────
const dashboard = read('src/app/delivery/page.tsx');
assert.ok(dashboard.includes('refetchInterval: 30_000'), 'the 30s poll must stay as the fallback');

console.log('OK: delivery.assigned push + sound/toast cue wired; 30s polling kept as fallback.');
