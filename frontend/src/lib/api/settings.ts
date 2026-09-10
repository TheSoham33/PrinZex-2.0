import { get } from './client';

/**
 * Public platform-config read (no auth): the admin-configured per-order
 * platform fee and whether customers may pay it from their wallet
 * (Settings → Platform). Order and checkout pages need it before placement.
 */
export interface PublicPlatformSettings {
  platformFee: number;
  platformFeeFromWallet: boolean;
  /** GST on the order subtotal, in percent — labels render this, quotes use it. */
  gstRatePercent: number;
  /** Customer-facing delivery charge per speed (backend enum keys). */
  deliveryFees: Record<'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP', number>;
  /** Promised delivery time per speed, in hours (backend enum keys). */
  deliveryEtaHours: Record<'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP', number>;
}

export const fetchPublicPlatformSettings = async (): Promise<PublicPlatformSettings> =>
  get<PublicPlatformSettings>('/content/settings');
