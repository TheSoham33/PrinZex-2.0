import { get } from './client';

/**
 * Public platform-config read (no auth): the admin-configured per-order
 * platform fee and whether customers may pay it from their wallet
 * (Settings → Platform). Order and checkout pages need it before placement.
 */
export interface PublicPlatformSettings {
  platformFee: number;
  platformFeeFromWallet: boolean;
}

export const fetchPublicPlatformSettings = async (): Promise<PublicPlatformSettings> =>
  get<PublicPlatformSettings>('/content/settings');
