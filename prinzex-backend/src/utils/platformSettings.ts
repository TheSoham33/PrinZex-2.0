import { ContentModel } from '../models/mongo/Content.model';

/**
 * Platform-wide numbers the admin tunes under Settings → Platform. They live
 * in the Mongo platform-settings doc (Content, type 'settings') — the same
 * store as the platform fee — so every change applies without a redeploy.
 *
 * One 60s read-through cache serves every consumer (quotes, placement,
 * assignment, wallet credits, settings writes), and an unreadable settings
 * store falls back to the code defaults: an order path must never break on a
 * Mongo hiccup. updateSettings() invalidates the cache on save.
 */

export type DeliverySpeedKey = 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP';
export const SPEED_KEYS: readonly DeliverySpeedKey[] = ['STANDARD', 'EXPRESS', 'SAME_DAY', 'PICKUP'];

export interface PlatformSettingsValues {
  /** GST rate, in percent (India slabs cap at 28). */
  gstRatePercent: number;
  /** Whether delivery/rush/platform fees join the GST taxable value (gap #9).
   *  true (default) = GST on subtotal + fees; false = subtotal only. */
  gstOnFees: boolean;
  /** Customer-facing delivery charge per speed, in ₹. */
  deliveryFees: Record<DeliverySpeedKey, number>;
  /** Quoted delivery promise per speed, in hours. */
  deliveryEtaHours: Record<DeliverySpeedKey, number>;
  /** Rider search radius for auto-assignment, in km. */
  assignRadiusKm: number;
  /** Max ₹ a single admin wallet credit may carry. */
  walletMaxCredit: number;
  /** Max users per bulk wallet credit call. */
  walletMaxBatchSize: number;
  /** Validation ceiling for the admin platform-fee input. */
  platformFeeMax: number;
}

/** Code fallbacks — identical to the values that were previously hardcoded. */
export const PLATFORM_SETTING_DEFAULTS: PlatformSettingsValues = {
  gstRatePercent: 18,
  gstOnFees: true,
  deliveryFees: { STANDARD: 0, EXPRESS: 50, SAME_DAY: 120, PICKUP: 0 },
  deliveryEtaHours: { STANDARD: 48, EXPRESS: 12, SAME_DAY: 6, PICKUP: 4 },
  assignRadiusKm: 10,
  walletMaxCredit: 100000,
  walletMaxBatchSize: 500,
  platformFeeMax: 10000,
};

/** Hard validation bounds per scalar key (write path and read clamping). */
export const SETTING_BOUNDS = {
  gstRatePercent: { min: 0, max: 28, maxDecimals: 2 },
  assignRadiusKm: { min: 1, max: 100, maxDecimals: 1 },
  walletMaxCredit: { min: 1, max: 10_000_000, maxDecimals: 2 },
  walletMaxBatchSize: { min: 1, max: 2000, maxDecimals: 0 },
  platformFeeMax: { min: 1, max: 1_000_000, maxDecimals: 2 },
  deliveryFee: { min: 0, max: 10_000, maxDecimals: 2 },
  deliveryEtaHours: { min: 1, max: 168, maxDecimals: 0 },
} as const;

/**
 * General bounded-number parser: finite, min..max, at most maxDecimals
 * decimals. Returns null when the input is unusable (the caller decides
 * between a 400 and a default fallback).
 */
export function parseBoundedNumber(
  input: unknown,
  min: number,
  max: number,
  maxDecimals = 2,
): number | null {
  const value = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  const factor = 10 ** maxDecimals;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-9 ? value : null;
}

/**
 * Lenient read-path merge for the per-speed maps: every speed key ends up
 * populated — a valid stored value wins, anything else falls back to the
 * code default, so a half-written settings doc can never produce a NaN quote.
 */
export function mergeSpeedMap(
  input: unknown,
  defaults: Record<DeliverySpeedKey, number>,
  bounds: { min: number; max: number; maxDecimals: number },
): Record<DeliverySpeedKey, number> {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const merged = {} as Record<DeliverySpeedKey, number>;
  for (const speed of SPEED_KEYS) {
    merged[speed] = parseBoundedNumber(source[speed], bounds.min, bounds.max, bounds.maxDecimals) ?? defaults[speed];
  }
  return merged;
}

export type SettingsMetadata = Record<string, unknown>;

const DEFAULTS = PLATFORM_SETTING_DEFAULTS;

/**
 * Strict write-path variant: EVERY speed key must be present and in range,
 * else null (the settings writer turns it into a 400 naming the field).
 */
export function parseSpeedMapStrict(
  input: unknown,
  bounds: { min: number; max: number; maxDecimals: number },
): Record<DeliverySpeedKey, number> | null {
  if (!input || typeof input !== 'object') return null;
  const source = input as Record<string, unknown>;
  const parsed = {} as Record<DeliverySpeedKey, number>;
  for (const speed of SPEED_KEYS) {
    const value = parseBoundedNumber(source[speed], bounds.min, bounds.max, bounds.maxDecimals);
    if (value === null) return null;
    parsed[speed] = value;
  }
  return parsed;
}

/** Defaults-filled mapping used by both the cached read path and getSettings. */
export function platformValuesFromMetadata(metadata: SettingsMetadata): PlatformSettingsValues {
  return {
    gstRatePercent:
      parseBoundedNumber(metadata.gstRatePercent, SETTING_BOUNDS.gstRatePercent.min, SETTING_BOUNDS.gstRatePercent.max) ??
      DEFAULTS.gstRatePercent,
    // Boolean toggle: a settings doc predating the key keeps the NEW policy
    // (fees taxable) — the default is the decision, not merely a fallback.
    gstOnFees: metadata.gstOnFees === undefined ? DEFAULTS.gstOnFees : metadata.gstOnFees === true,
    deliveryFees: mergeSpeedMap(metadata.deliveryFees, DEFAULTS.deliveryFees, SETTING_BOUNDS.deliveryFee),
    deliveryEtaHours: mergeSpeedMap(metadata.deliveryEtaHours, DEFAULTS.deliveryEtaHours, SETTING_BOUNDS.deliveryEtaHours),
    assignRadiusKm:
      parseBoundedNumber(metadata.assignRadiusKm, SETTING_BOUNDS.assignRadiusKm.min, SETTING_BOUNDS.assignRadiusKm.max, 1) ??
      DEFAULTS.assignRadiusKm,
    walletMaxCredit:
      parseBoundedNumber(metadata.walletMaxCredit, SETTING_BOUNDS.walletMaxCredit.min, SETTING_BOUNDS.walletMaxCredit.max) ??
      DEFAULTS.walletMaxCredit,
    walletMaxBatchSize:
      parseBoundedNumber(metadata.walletMaxBatchSize, SETTING_BOUNDS.walletMaxBatchSize.min, SETTING_BOUNDS.walletMaxBatchSize.max, 0) ??
      DEFAULTS.walletMaxBatchSize,
    platformFeeMax:
      parseBoundedNumber(metadata.platformFeeMax, SETTING_BOUNDS.platformFeeMax.min, SETTING_BOUNDS.platformFeeMax.max) ??
      DEFAULTS.platformFeeMax,
  };
}

const CACHE_TTL_MS = 60_000;
let cache: { metadata: SettingsMetadata | null; at: number } | null = null;

/**
 * Raw settings metadata (null when the doc doesn't exist or the store is
 * unreadable) — platformFee.ts layers its own fee semantics on top of this.
 */
export async function getSettingsMetadata(): Promise<SettingsMetadata | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.metadata;
  }
  let metadata: SettingsMetadata | null = null;
  try {
    const doc = await ContentModel.findOne({ type: 'settings' }).lean();
    metadata = (doc?.metadata as SettingsMetadata) ?? null;
  } catch {
    // Settings store down — consumers fall back to code defaults.
  }
  cache = { metadata, at: Date.now() };
  return metadata;
}

/** All platform values, defaults filled — the order/assignment read path. */
export async function getPlatformSettingsValues(): Promise<PlatformSettingsValues> {
  const metadata = await getSettingsMetadata();
  return metadata ? platformValuesFromMetadata(metadata) : DEFAULTS;
}

export const getGstRate = async (): Promise<number> => (await getPlatformSettingsValues()).gstRatePercent / 100;
export const getGstOnFees = async (): Promise<boolean> => (await getPlatformSettingsValues()).gstOnFees;
export const getDeliveryFees = async (): Promise<Record<DeliverySpeedKey, number>> => (await getPlatformSettingsValues()).deliveryFees;
export const getDeliveryEtaHours = async (): Promise<Record<DeliverySpeedKey, number>> => (await getPlatformSettingsValues()).deliveryEtaHours;
export const getAssignRadiusKm = async (): Promise<number> => (await getPlatformSettingsValues()).assignRadiusKm;
export const getPlatformFeeMax = async (): Promise<number> => (await getPlatformSettingsValues()).platformFeeMax;

export interface WalletLimits {
  maxCredit: number;
  maxBatchSize: number;
}
export async function getWalletLimits(): Promise<WalletLimits> {
  const values = await getPlatformSettingsValues();
  return { maxCredit: values.walletMaxCredit, maxBatchSize: values.walletMaxBatchSize };
}

/** Called by the settings writer so just-saved values apply immediately. */
export function invalidatePlatformSettingsCache(): void {
  cache = null;
}
