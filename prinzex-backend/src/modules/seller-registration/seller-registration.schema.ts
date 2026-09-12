import { z } from 'zod';

/**
 * Seller onboarding wizard schemas (frontend step 7).
 *
 * The applicant authenticates with their CUSTOMER JWT — the Seller record
 * and the SELLER role are created by POST /api/seller/register itself.
 */

const gstField = z
  .string()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GST number format')
  .optional();

const timeField = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM (24h)');

export const registerSellerBody = z.object({
  storeName: z.string().min(2).max(200),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  gstNumber: gstField,
  businessType: z.enum(['sole_proprietor', 'partnership', 'pvt_ltd', 'llp']),
  storeAddress: z.string().min(10, 'Store address is too short'),
  city: z.string(),
  state: z.string(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  openingTime: timeField,
  closingTime: timeField,
  services: z
    .array(
      z.object({
        categoryId: z.string(),
        categoryName: z.string(),
        serviceId: z.string(),
        serviceName: z.string(),
        basePrice: z.number().positive(),
        unit: z.string(),
      }),
    )
    .min(1, 'Add at least one service'),
  bankDetails: z.object({
    accountHolderName: z.string(),
    accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN number'),
  }),
});

export type RegisterSellerInput = z.infer<typeof registerSellerBody>;
