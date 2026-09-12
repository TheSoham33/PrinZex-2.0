/**
 * Order status transition rules used by the customer-facing mutations
 * (cancel flow in orders.service). Seller advance has its own stricter
 * step-by-step guard (assertForwardTransition in seller.service); admin
 * interventions bypass by design.
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_pickup', 'cancelled'],
  // The seller marks picked_up at the physical handover to the rider; only
  // then may the rider move the order out_for_delivery (delivery.service).
  ready_for_pickup: ['picked_up'],
  picked_up: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: [], // terminal
  cancelled: [], // terminal
  returned: [], // terminal
};

export function isValidTransition(from: string, to: string): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
