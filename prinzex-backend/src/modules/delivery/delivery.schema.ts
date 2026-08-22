import { z } from 'zod';

/**
 * Delivery module request schemas — registration, profile, availability,
 * active-delivery workflow, earnings and admin management.
 *
 * `deliveryBoyId` NEVER comes from the request: always from the JWT.
 */

const bankFields = {
  accountHolderName: z.string().min(2),
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
};

// ── POST /api/delivery/register (public) ───────────────────────────────────

export const registerDeliveryBody = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z.string().email().optional(),
  city: z.string(),
  vehicleType: z.enum(['bike', 'scooter', 'car']),
  vehicleRegNo: z.string().min(5),
  licenseNumber: z.string().min(5),
  bankDetails: z.object(bankFields),
});

// ── Profile ────────────────────────────────────────────────────────────────

// Phone is the login identifier — deliberately NOT updatable here.
export const updateDeliveryProfileBody = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().nullable().optional(),
    city: z.string().trim().min(2).max(60).optional(),
    vehicleType: z.enum(['bike', 'scooter', 'car']).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

export const updateBankBody = z.object(bankFields);

// ── Availability ───────────────────────────────────────────────────────────

export const availabilityBody = z.object({
  isOnline: z.boolean(),
});

// ── Active delivery ────────────────────────────────────────────────────────

export const locationPingBody = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  speed: z.number().min(0).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

export const deliverBody = z.object({
  podPhotoUrl: z.string().trim().min(1).max(2048).optional(),
  otpProvided: z.string().trim().regex(/^\d{4}$/, 'Delivery OTP is 4 digits').optional(),
});

export const failDeliveryBody = z.object({
  reason: z.string().trim().min(3, 'Give a short failure reason').max(500),
});

// ── Earnings / payouts ─────────────────────────────────────────────────────

export const earningsQuery = z.object({
  period: z.enum(['7d', '30d', 'this_month']).default('7d'),
});

export const payoutsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Admin management ───────────────────────────────────────────────────────

export const adminDeliveryBoysQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  city: z.string().optional(),
  isOnline: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminDeliveryBoyParams = z.object({ id: z.string().min(1) });

export const adminDeliveryBoyStatusBody = z.object({
  status: z.enum(['APPROVED', 'ACTIVE', 'INACTIVE', 'SUSPENDED']),
  reason: z.string().trim().max(500).optional(),
});

export const adminVerifyDocumentBody = z.object({
  docId: z.string().min(1),
  isVerified: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

export const adminAssignDeliveryBody = z.object({
  deliveryBoyId: z.string().min(1),
});

// ── Inferred DTO types ─────────────────────────────────────────────────────

export type RegisterDeliveryInput = z.infer<typeof registerDeliveryBody>;
export type UpdateDeliveryProfileInput = z.infer<typeof updateDeliveryProfileBody>;
export type UpdateBankInput = z.infer<typeof updateBankBody>;
export type AvailabilityInput = z.infer<typeof availabilityBody>;
export type LocationPingInput = z.infer<typeof locationPingBody>;
export type DeliverInput = z.infer<typeof deliverBody>;
export type FailDeliveryInput = z.infer<typeof failDeliveryBody>;
export type EarningsQuery = z.infer<typeof earningsQuery>;
export type PayoutsQuery = z.infer<typeof payoutsQuery>;
export type AdminDeliveryBoysQuery = z.infer<typeof adminDeliveryBoysQuery>;
export type AdminDeliveryBoyStatusInput = z.infer<typeof adminDeliveryBoyStatusBody>;
export type AdminVerifyDocumentInput = z.infer<typeof adminVerifyDocumentBody>;
export type AdminAssignDeliveryInput = z.infer<typeof adminAssignDeliveryBody>;
