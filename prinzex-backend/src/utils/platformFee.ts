import { getSettingsMetadata, invalidatePlatformSettingsCache, parseBoundedNumber, SETTING_BOUNDS } from './platformSettings';
import { roundMoney } from './financial';

/**
 * Admin-configurable platform fee (Settings → Platform tab). The value lives
 * in the same Mongo platform-settings document as the other platform switches
 * (`Content`, type 'settings'), so the admin changes it without a redeploy.
 *
 * Money rules kept here so orders/quotes never hand-roll them:
 *  - fee defaults to ₹0 (no fee) and is a flat per-order amount, max 2dp;
 *  - by default the fee is NEVER payable from the wallet — the customer
 *    always pays it online from real money; the admin checkbox flips that.
 *
 * A 60s read-through cache keeps the order/quote path off Mongo, and an
 * unreadable settings store falls back to NO fee (orders must never break on
 * a Mongo hiccup). updateSettings() invalidates the cache on save.
 */

export interface PlatformFeeConfig {
  /** Flat per-order platform fee in ₹ (0 = no fee). */
  fee: number;
  /** Admin toggle: may the wallet settle the platform fee? Default false. */
  fromWallet: boolean;
}

const NO_FEE: PlatformFeeConfig = { fee: 0, fromWallet: false };

/** Default fee ceiling — the admin can retune it (platformFeeMax setting). */
export const MAX_PLATFORM_FEE = 10000;

/**
 * Validate an admin-supplied fee: finite, 0..max, at most 2 decimals.
 * The ceiling defaults to MAX_PLATFORM_FEE but the settings writer passes
 * the admin-configured platformFeeMax instead.
 * Returns null when the input is unusable (mirrors parseMaxUploadMb).
 */
export function parsePlatformFee(input: unknown, max: number = MAX_PLATFORM_FEE): number | null {
  const value = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > max) return null;
  return roundMoney(value) === value ? value : null;
}

/**
 * The share of an order total the wallet is ALLOWED to settle: normally
 * everything except the platform fee; the whole total when the admin toggle
 * permits wallet-paid fees (or no fee exists).
 */
export function walletCoverableMax(total: number, fee: number, fromWallet: boolean): number {
  return fromWallet ? roundMoney(total) : Math.max(0, roundMoney(total - fee));
}

/**
 * The fee that actually applies: the admin master switch decides. A settings
 * document predating the switch (no key stored) keeps its old behaviour —
 * a configured fee stays live — so an existing fee never silently stops.
 * Returns 0 whenever the switch is OFF or the amount is unusable.
 */
export function effectivePlatformFee(feeEnabled: unknown, fee: unknown, max: number = MAX_PLATFORM_FEE): number {
  const amount = parsePlatformFee(fee, max) ?? 0;
  const enabled = feeEnabled === undefined ? amount > 0 : feeEnabled === true;
  return enabled ? amount : 0;
}

/**
 * Current fee config, layered over the shared settings-doc cache in
 * platformSettings (one 60s Mongo read feeds every platform value).
 * Falls back to NO_FEE when the doc is missing or the store is unreadable.
 */
export async function getPlatformFeeConfig(): Promise<PlatformFeeConfig> {
  const metadata = await getSettingsMetadata();
  if (!metadata) return NO_FEE;
  const max =
    parseBoundedNumber(metadata.platformFeeMax, SETTING_BOUNDS.platformFeeMax.min, SETTING_BOUNDS.platformFeeMax.max) ??
    MAX_PLATFORM_FEE;
  return {
    fee: effectivePlatformFee(metadata.platformFeeEnabled, metadata.platformFee, max),
    fromWallet: metadata.platformFeeFromWallet === true,
  };
}

/** Kept for existing call sites — invalidates the shared settings cache. */
export function invalidatePlatformFeeCache(): void {
  invalidatePlatformSettingsCache();
}
