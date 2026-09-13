import { z } from 'zod';

/**
 * Device push-token schemas (gap #10). Every actor lane registers its FCM
 * registration token against its own recipient id — the same token table,
 * the same endpoints, the recipient identity always comes from the JWT.
 */

export const registerDeviceBody = z.object({
  token: z
    .string()
    .trim()
    .min(20, 'Token is too short to be an FCM registration token')
    .max(4096, 'Token is too long'),
  platform: z.enum(['web', 'android', 'ios']).default('web'),
});

export const deleteDeviceBody = z.object({
  token: z.string().trim().min(1).max(4096),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceBody>;
export type DeleteDeviceInput = z.infer<typeof deleteDeviceBody>;
