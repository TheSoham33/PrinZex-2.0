import { ContentModel } from '../models/mongo/Content.model';

/**
 * Admin-configurable cap for the customer ORDER-FILE upload (the main
 * design file). The value lives in the platform-settings document (Mongo
 * `Content`, type 'settings') — the same store the Admin → Settings →
 * Platform tab edits — so it changes without a redeploy. A 60s read-through
 * cache keeps the hot upload path off Mongo; updateSettings() invalidates
 * the cache the moment the admin saves.
 *
 * Ceiling: 128MB equals Gotenberg's --api-body-limit — a larger online cap
 * would admit Office files the sidecar can never convert. Multer (see
 * fileUpload.ts) uses this same ceiling as its hard limit; the effective,
 * customer-facing cap is whatever this module returns.
 */

export const DEFAULT_MAX_UPLOAD_MB = 100;
export const MAX_CONFIGURABLE_UPLOAD_MB = 128;

const CACHE_TTL_MS = 60_000;

/** Returns the current cap in MB from whatever store the caller injects. */
export type UploadLimitLoader = () => Promise<number | null>;

/**
 * Validate an admin-supplied value: a whole number of MB within the
 * supported range. Returns null when the input is unusable.
 */
export function parseMaxUploadMb(input: unknown): number | null {
  const value = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 1 || value > MAX_CONFIGURABLE_UPLOAD_MB) return null;
  return value;
}

const readFromSettings: UploadLimitLoader = async () => {
  const doc = await ContentModel.findOne({ type: 'settings' }).lean();
  return parseMaxUploadMb(doc?.metadata?.maxUploadFileSizeMb);
};

let cache: { valueMb: number; at: number } | null = null;

/**
 * Current cap in bytes. Falls back to the default when the settings store
 * is unreadable — an upload must never break because Mongo had a hiccup.
 */
export async function getMaxUploadDesignBytes(
  loader: UploadLimitLoader = readFromSettings,
): Promise<number> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.valueMb * 1024 * 1024;
  }
  let valueMb = DEFAULT_MAX_UPLOAD_MB;
  try {
    valueMb = (await loader()) ?? DEFAULT_MAX_UPLOAD_MB;
  } catch {
    // Settings store down — enforce the default rather than rejecting uploads.
  }
  cache = { valueMb, at: Date.now() };
  return valueMb * 1024 * 1024;
}

/** Called by the settings writer so a just-saved cap applies immediately. */
export function invalidateUploadLimitCache(): void {
  cache = null;
}
