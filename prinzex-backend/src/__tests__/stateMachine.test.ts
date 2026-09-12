/**
 * Order state machine — ported 1:1 from the state-machine section of
 * scripts/check-delivery-endpoints.ts, plus a full walk of the transition
 * table (every declared edge valid, every terminal state closed, everything
 * else rejected).
 */
import { isValidTransition, ORDER_TRANSITIONS } from '../utils/stateMachine';

describe('ORDER_TRANSITIONS table', () => {
  test('declares the customer-facing lifecycle with the seller handover step', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual(
      [
        'placed',
        'confirmed',
        'processing',
        'ready_for_pickup',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
      ].sort(),
    );
  });

  test('terminal states have no outgoing edges', () => {
    for (const terminal of ['delivered', 'cancelled', 'returned']) {
      expect(ORDER_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  test('every declared edge is valid via isValidTransition', () => {
    for (const [from, targets] of Object.entries(ORDER_TRANSITIONS)) {
      for (const to of targets) {
        expect(isValidTransition(from, to)).toBe(true);
      }
    }
  });
});

describe('isValidTransition', () => {
  test.each([
    ['placed', 'confirmed'],
    ['placed', 'cancelled'],
    ['confirmed', 'processing'],
    ['confirmed', 'cancelled'],
    ['processing', 'ready_for_pickup'],
    ['processing', 'cancelled'],
    ['ready_for_pickup', 'picked_up'],
    ['picked_up', 'out_for_delivery'],
    ['out_for_delivery', 'delivered'],
    ['out_for_delivery', 'returned'],
  ])('%s → %s is valid', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  test.each([
    ['placed', 'placed'], // no self-transitions
    ['confirmed', 'placed'], // no going backwards
    ['delivered', 'placed'], // terminal stays terminal
    ['cancelled', 'confirmed'],
    ['returned', 'out_for_delivery'],
    ['nope', 'placed'], // unknown source state
    ['placed', 'nope'], // unknown target state
    ['', 'placed'],
  ])('%s → %s is invalid', (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  // ── Ported 1:1 from check-delivery-endpoints.ts ─────────────────────────
  test('the seller handover step (picked_up) must not be skippable', () => {
    expect(isValidTransition('ready_for_pickup', 'picked_up')).toBe(true);
    expect(isValidTransition('picked_up', 'out_for_delivery')).toBe(true);
    expect(isValidTransition('ready_for_pickup', 'out_for_delivery')).toBe(false);
  });
});
