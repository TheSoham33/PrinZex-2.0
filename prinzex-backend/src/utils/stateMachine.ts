import { ApiError } from './ApiError';
import { ORDER_STATUSES } from '../types';

/**
 * Order status transition rules — the single source of truth for every
 * order-lifecycle mutation (customer cancel, seller advance, delivery flow,
 * admin interventions where applicable).
 *
 * Any transition not in this map is rejected with 400.
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: [], // terminal
  cancelled: [], // terminal
  returned: [], // terminal
};

export function isValidTransition(from: string, to: string): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Terminal statuses accept no further transitions. */
export function isTerminalStatus(status: string): boolean {
  const targets = ORDER_TRANSITIONS[status];
  return targets !== undefined && targets.length === 0;
}

/**
 * Throwing variant for services: 400 with a descriptive message listing the
 * allowed next statuses. Unknown statuses are rejected too.
 */
export function assertValidTransition(from: string, to: string): void {
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) {
    throw ApiError.badRequest(
      `Unknown order status "${to}" — allowed: ${ORDER_STATUSES.join(', ')}`,
    );
  }
  if (isValidTransition(from, to)) {
    return;
  }

  const allowed = ORDER_TRANSITIONS[from];
  if (!allowed) {
    throw ApiError.badRequest(`Unknown current order status "${from}"`);
  }
  if (allowed.length === 0) {
    throw ApiError.badRequest(`Order is ${from} — it can no longer transition`);
  }
  throw ApiError.badRequest(
    `Invalid status transition "${from}" → "${to}" — allowed: ${allowed.join(', ')}`,
  );
}
