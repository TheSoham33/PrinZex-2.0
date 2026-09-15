import { prisma } from '../../config/database';
import type { RegisterDeviceInput } from './devices.schema';

/**
 * Device push-token registry (gap #10). The FCM token is globally unique, so
 * registering is an upsert keyed on `token`: the same device handed to a new
 * account (logout/login on a shared browser) simply moves to the new owner.
 */

export type DeviceRecipient = {
  recipientType: 'customer' | 'seller' | 'delivery_boy';
  recipientId: string;
};

/** Local projection of the DeviceToken row the registry exposes (gap #10). */
export interface RegisteredDevice {
  id: string;
  recipientId: string;
  recipientType: string;
  token: string;
  platform: string;
  userAgent: string | null;
  createdAt: Date;
}

export async function registerDeviceToken(
  recipient: DeviceRecipient,
  input: RegisterDeviceInput,
  userAgent?: string,
): Promise<RegisteredDevice> {
  return prisma.deviceToken.upsert({
    where: { token: input.token },
    update: {
      recipientId: recipient.recipientId,
      recipientType: recipient.recipientType,
      platform: input.platform,
      ...(userAgent ? { userAgent } : {}),
    },
    create: {
      recipientId: recipient.recipientId,
      recipientType: recipient.recipientType,
      token: input.token,
      platform: input.platform,
      ...(userAgent ? { userAgent } : {}),
    },
  });
}

/** Delete one token if it belongs to this recipient (logout / permission revoke). */
export async function deleteDeviceToken(
  recipient: DeviceRecipient,
  token: string,
): Promise<{ deleted: boolean }> {
  const result = await prisma.deviceToken.deleteMany({
    where: { token, recipientId: recipient.recipientId, recipientType: recipient.recipientType },
  });
  return { deleted: result.count > 0 };
}

/** The devices registered to this recipient (settings/debug surface). */
export async function listDeviceTokens(recipient: DeviceRecipient): Promise<RegisteredDevice[]> {
  return prisma.deviceToken.findMany({
    where: { recipientId: recipient.recipientId, recipientType: recipient.recipientType },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
