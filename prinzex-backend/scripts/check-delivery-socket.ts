/**
 * Guard for the rider assignment push (gap #6 — riders must not learn about
 * assignments only by 30s polling):
 *
 *   · the event name is the spec literal `delivery.assigned` (dot, not the
 *     colon used by the sibling order events)
 *   · it is emitted on the /orders namespace to the rider room
 *     `delivery:{deliveryBoyId}`
 *   · BOTH the auto-assignment and the manual (admin) assignment paths push it
 *   · the payload carries the pickup/drop addresses + customer phone so the
 *     rider app can cue a toast before the next poll lands
 *   · the rider app keeps its 30s refetch as a fallback — that half of the
 *     contract is guarded by frontend/scripts/check-delivery-socket.ts
 *
 * String-read based (like the other check-* scripts) so it needs no DB,
 * Redis or Mongo sidecars.
 *
 * Run: npx tsx scripts/check-delivery-socket.ts   (from prinzex-backend)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const emitters = read('src/realtime/realtime.emitters.ts');
const assignment = read('src/modules/delivery/delivery.assignment.ts');

// ── the event name is the spec literal ────────────────────────────────────
assert.ok(
  emitters.includes("DELIVERY_ASSIGNED: 'delivery.assigned'"),
  'RT_EVENTS.DELIVERY_ASSIGNED must be the spec literal `delivery.assigned`',
);
assert.ok(
  !emitters.includes("DELIVERY_ASSIGNED: 'delivery:assigned'"),
  'the assignment event must use the spec dot name, not the colon variant',
);

// ── namespace + rider room ────────────────────────────────────────────────
assert.ok(
  emitters.includes('RT_NAMESPACES.ORDERS, RT_ROOMS.delivery(deliveryBoyId), RT_EVENTS.DELIVERY_ASSIGNED'),
  'delivery.assigned must be emitted on /orders to the delivery:{id} room',
);

// ── both assignment paths push the event ──────────────────────────────────
// Call sites only (exclude the `function emitAssignedSocket(` definition).
const emitCalls = assignment.match(/^\s*emitAssignedSocket\(/gm) ?? [];
assert.equal(
  emitCalls.length,
  2,
  'autoAssignDelivery AND manualAssignDelivery must both push delivery.assigned',
);
assert.ok(assignment.includes('pickupAddress'), 'payload must carry the pickup address');
assert.ok(assignment.includes('deliveryAddress'), 'payload must carry the drop address');
assert.ok(assignment.includes('customerPhone'), 'payload must carry the customer phone');

console.log('OK: delivery.assigned is pushed to the rider room on auto + manual assignment.');
