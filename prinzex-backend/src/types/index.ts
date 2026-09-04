/**
 * Shared domain types used across modules.
 *
 * PostgreSQL enum-backed strings (role, seller status, ...) come from
 * `@prisma/client`. The types below model the string-typed columns that the
 * schema intentionally keeps as free-form strings (status flows, JSON
 * snapshots), so every layer agrees on the allowed values.
 */

import type { TokenPayload } from '../utils/jwt';

// ── Express augmentation ───────────────────────────────────────────────────
// `authenticate` attaches the verified JWT payload as `req.user` and the raw
// bearer token as `req.token`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      token?: string;
    }
  }
}

// ── Order lifecycle ────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// ── JSON snapshots ─────────────────────────────────────────────────────────
/** Snapshot stored on `Order.deliveryAddress` at purchase time. */
export interface DeliveryAddressSnapshot {
  label: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  lat: number | null;
  lng: number | null;
}

/** Free-form per-service specs stored on `OrderItem.specifications`. */
export interface OrderItemSpecifications {
  [key: string]: string | number | boolean | null;
}

// ── HTTP envelopes ─────────────────────────────────────────────────────────
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors: unknown[];
  stack?: string;
}
