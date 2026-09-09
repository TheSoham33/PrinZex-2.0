import { ContentModel } from '../models/mongo/Content.model';
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

/** Hard ceiling for a sane flat fee — guards against a fat-fingered admin. */
export const MAX_PLATFORM_FEE = 10000;

/**
 * Validate an admin-supplied fee: finite, 0..MAX, at most 2 decimals.
 * Returns null when the input is unusable (mirrors parseMaxUploadMb).
 */
export function parsePlatformFee(input: unknown): number | null {
  const value = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_PLATFORM_FEE) return null;
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

const readFromSettings = async (): Promise<PlatformFeeConfig | null> => {
  const doc = await ContentModel.findOne({ type: 'settings' }).lean();
  if (!doc) return null;
  return {
    fee: parsePlatformFee(doc.metadata?.platformFee) ?? 0,
    fromWallet: doc.metadata?.platformFeeFromWallet === true,
  };
};

const CACHE_TTL_MS = 60_000;
let cache: { config: PlatformFeeConfig; at: number } | null = null;

/** Current fee config — falls back to NO_FEE when the store is unreadable. */
export async function getPlatformFeeConfig(): Promise<PlatformFeeConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.config;
  }
  let config = NO_FEE;
  try {
    config = (await readFromSettings()) ?? NO_FEE;
  } catch {
    // Settings store down — charge no fee rather than blocking checkout.
  }
  cache = { config, at: Date.now() };
  return config;
}

/** Called by the settings writer so a just-saved fee applies immediately. */
export function invalidatePlatformFeeCache(): void {
  cache = null;
}
