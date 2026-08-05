import { z } from 'zod';
import { ORDER_STATUSES } from '../../types';

/**
 * Seller store management schemas — /api/seller/*
 *
 * `sellerId` NEVER comes from the request: every scoped route derives it
 * from the authenticated seller JWT (req.user.sellerId).
 */

const timeField = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM (24h)');
const positiveMoney = z
  .number()
  .positive('Price must be greater than 0')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
    message: 'Price must have at most 2 decimal places',
  });

// ── Store profile ──────────────────────────────────────────────────────────

export const updateStoreBody = z
  .object({
    storeName: z.string().trim().min(2).max(200).optional(),
    ownerName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
    businessType: z.string().optional(),
    gstNumber: z.string().trim().max(15).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    storeAddress: z.string().trim().min(10).max(300).optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional(),
    openingTime: timeField.optional(),
    closingTime: timeField.optional(),
    logoUrl: z.string().trim().min(1).max(2048).nullable().optional(),
    bannerUrl: z.string().trim().min(1).max(2048).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

// ── Services ───────────────────────────────────────────────────────────────

export const serviceParams = z.object({ serviceId: z.string().min(1) });

export const createServiceBody = z.object({
  categoryId: z.string().trim().min(1),
  categoryName: z.string().trim().min(1).max(120),
  serviceId: z.string().trim().min(1).max(120),
  serviceName: z.string().trim().min(1).max(160),
  basePrice: positiveMoney,
  unit: z.string().trim().min(1).max(40),
});

export const updateServiceBody = z
  .object({
    basePrice: positiveMoney.optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

// ── Pricing ────────────────────────────────────────────────────────────────

/** Body IS the array per spec: PATCH /pricing/bulk accepts `[{...}, ...]`. */
export const bulkPricingBody = z
  .array(
    z.object({
      serviceId: z.string().min(1),
      basePrice: positiveMoney,
      unit: z.string().trim().min(1).max(40),
    }),
  )
  .min(1, 'Provide at least one service price update');

export const bulkDiscountsBody = z.object({
  tiers: z
    .array(
      z.object({
        minQty: z.number().int().positive(),
        discountPct: z.number().min(0).max(100),
      }),
    )
    .min(1, 'Provide at least one discount tier'),
});

// ── Inventory ──────────────────────────────────────────────────────────────

export const inventoryParams = z.object({ itemId: z.string().min(1) });

export const inventoryQuery = z.object({
  lowStockOnly: z.enum(['true', 'false']).optional(),
});

export const createInventoryBody = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120),
  currentStock: z.number().int().min(0),
  unit: z.string().trim().min(1).max(40),
  lowStockThreshold: z.number().int().min(0),
});

export const updateInventoryBody = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    currentStock: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

// ── Team ───────────────────────────────────────────────────────────────────

export const TEAM_ROLES = ['manager', 'operator', 'support'] as const;

export const teamParams = z.object({ memberId: z.string().min(1) });

export const createTeamMemberBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .optional(),
  role: z.enum(TEAM_ROLES),
});

export const updateTeamMemberBody = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(TEAM_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });

// ── Analytics ──────────────────────────────────────────────────────────────

export const ANALYTICS_PERIODS = ['7d', '30d', 'this_month', 'last_month'] as const;

export const analyticsQuery = z.object({
  period: z.enum(ANALYTICS_PERIODS).default('30d'),
});

// ── Orders ─────────────────────────────────────────────────────────────────

export const ordersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  isRush: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderParams = z.object({ orderId: z.string().min(1) });

export const updateOrderStatusBody = z.object({
  status: z.enum(['confirmed', 'processing', 'ready_for_pickup']),
  note: z.string().trim().max(500).optional(),
});

export const rejectOrderBody = z.object({
  reason: z.string().trim().min(3, 'Give the customer a short reason').max(500),
});

// ── Payouts ────────────────────────────────────────────────────────────────

export const payoutsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Settings ───────────────────────────────────────────────────────────────

export const deliverySettingsBody = z
  .object({
    deliveryRadius: z.number().int().min(1).max(100).optional(),
    pincodes: z
      .array(
        z.object({
          pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
          isExcluded: z.boolean(),
        }),
      )
      .optional(),
  })
  .refine((value) => value.deliveryRadius !== undefined || value.pincodes !== undefined, {
    message: 'Provide deliveryRadius and/or pincodes',
  });

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const hoursSettingsBody = z.object({
  hours: z
    .array(
      z.object({
        day: z.enum(WEEK_DAYS),
        open: timeField,
        close: timeField,
        closed: z.boolean(),
      }),
    )
    .min(1)
    .max(7),
});

// ── Inferred DTO types ─────────────────────────────────────────────────────

export type UpdateStoreInput = z.infer<typeof updateStoreBody>;
export type CreateServiceInput = z.infer<typeof createServiceBody>;
export type UpdateServiceInput = z.infer<typeof updateServiceBody>;
export type BulkPricingInput = z.infer<typeof bulkPricingBody>;
export type BulkDiscountsInput = z.infer<typeof bulkDiscountsBody>;
export type InventoryQuery = z.infer<typeof inventoryQuery>;
export type CreateInventoryInput = z.infer<typeof createInventoryBody>;
export type UpdateInventoryInput = z.infer<typeof updateInventoryBody>;
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberBody>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberBody>;
export type AnalyticsQuery = z.infer<typeof analyticsQuery>;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
export type OrdersQuery = z.infer<typeof ordersQuery>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusBody>;
export type RejectOrderInput = z.infer<typeof rejectOrderBody>;
export type PayoutsQuery = z.infer<typeof payoutsQuery>;
export type DeliverySettingsInput = z.infer<typeof deliverySettingsBody>;
export type HoursSettingsInput = z.infer<typeof hoursSettingsBody>;
export type WeekDay = (typeof WEEK_DAYS)[number];
