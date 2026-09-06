import { z } from 'zod';

/**
 * Write-time validation per catalogue group key. Admin edits replace a whole
 * group, so every stored row is guaranteed to match the shape the seller and
 * customer UIs render.
 */

const keyString = z.string().trim().min(1).max(60);
const labelString = z.string().trim().min(1).max(120);

/** `{ value, label, hint? }` — plain customization options. */
const hintOption = z.object({
  value: keyString,
  label: labelString,
  hint: z.string().trim().max(200).optional(),
});

/**
 * Paper types / sizes — carry a relative price factor (baseline option = 1).
 * ponytail: the multiplier is informational today — computeQuote prices paper
 * via the seller's absolute ₹ add-ons, so editing it changes no totals.
 * Upgrade path: use it as the fallback rate factor in computeQuote for
 * options a seller hasn't priced explicitly.
 */
const multiplierOption = hintOption.extend({
  multiplier: z.number().positive().max(100),
});

/** Labeled rows with a fixed price — base for the stapling options. */
const pricedOption = z.object({
  value: keyString,
  label: labelString,
  price: z.number().min(0).max(100000),
});

/**
 * Stapling options — hint + per-set price. The order-page radio is mandatory
 * with 'loose' (Loose Sheet) as the always-available free default, so that
 * row must stay first and free (the backend also treats 'loose' as free no
 * matter what a row claims).
 */
const staplingOptions = z
  .array(
    pricedOption.extend({
      hint: z.string().trim().max(200).optional(),
    }),
  )
  .refine((rows) => rows[0]?.value === 'loose' && rows[0].price === 0, {
    message: "Keep a free 'loose' (Loose Sheet) row first",
  });

/**
 * Lamination film thickness — hint + per-sheet price. Mandatory radio with
 * 'micron-80' as the always-available free default, so that row must stay
 * first and free (the backend also treats 'micron-80' as free no matter
 * what a row claims).
 */
const filmThickness = z
  .array(
    pricedOption.extend({
      hint: z.string().trim().max(200).optional(),
    }),
  )
  .refine((rows) => rows[0]?.value === 'micron-80' && rows[0].price === 0, {
    message: "Keep a free 'micron-80' (80 micron) row first",
  });

/** Colour swatches — Tailwind class / hex / premium flag. */
const swatchOption = z.object({
  value: keyString,
  label: labelString,
  class: z.string().trim().max(80).optional(),
  hex: z.string().trim().max(9).optional(),
  premium: z.boolean().optional(),
});

/** Hard ceiling for multi-file orders — also the zod cap on order payloads
 *  (orders.schema.ts) and the admin-catalog editor input. */
export const MAX_FILES_PER_ORDER = 10;

const serviceCategories = z.array(
  z.object({
    id: keyString,
    name: labelString,
    description: z.string().trim().max(200).optional(),
    services: z
      .array(
        z.object({
          id: keyString,
          name: labelString,
          /** Admin knob: how many documents a customer may attach to one
           *  order of this service. Absent = 1 (single-file, the original
           *  behaviour). All files share the order's specifications. */
          maxFilesPerOrder: z.number().int().min(1).max(MAX_FILES_PER_ORDER).optional(),
        }),
      )
      .min(1, 'A category needs at least one service'),
  }),
);

/**
 * How many files a service accepts per order, read straight from a
 * 'service-categories' group's data. Pure + defensive: unknown services,
 * malformed groups and out-of-range values fall back to 1 (single-file) so
 * order placement stays conservative when the catalogue misbehaves.
 */
export function serviceMaxFilesPerOrder(categoriesData: unknown, serviceId: string): number {
  if (!Array.isArray(categoriesData)) return 1;
  for (const category of categoriesData) {
    const services = (category as { services?: unknown } | null)?.services;
    if (!Array.isArray(services)) continue;
    for (const entry of services) {
      const s = entry as { id?: unknown; maxFilesPerOrder?: unknown } | null;
      if (s?.id !== serviceId) continue;
      return typeof s.maxFilesPerOrder === 'number' && Number.isInteger(s.maxFilesPerOrder)
        ? Math.min(Math.max(1, s.maxFilesPerOrder), MAX_FILES_PER_ORDER)
        : 1;
    }
  }
  return 1;
}

/** Corners-style options — may declare shapes they can't combine with. */
const hintOptionWithIncompatible = hintOption.extend({
  incompatibleWith: z.array(keyString).optional(),
});

const hintOptions = z.array(hintOption);
const hintOptionsWithIncompatible = z.array(hintOptionWithIncompatible);
const multiplierOptions = z.array(multiplierOption);
const swatchOptions = z.array(swatchOption);

export const CATALOG_GROUP_SCHEMAS: Record<string, z.ZodType<unknown>> = {
  'service-categories': serviceCategories,
  'paper-types': multiplierOptions,
  'paper-sizes': multiplierOptions,
  'stapling-options': staplingOptions,
  'film-thickness': filmThickness,
  'cover-types': hintOptions,
  'spiral-coil-types': hintOptions,
  'spiral-cover-types': hintOptions,
  'cover-colors': swatchOptions,
  'tape-colors': swatchOptions,
  'cover-text-colors': swatchOptions,
  'twin-loop-wire-colors': swatchOptions,
  'twin-loop-front-covers': hintOptions,
  'twin-loop-back-covers': hintOptions,
  'card-shapes': hintOptions,
  'card-papers': hintOptions,
  'card-sizes': hintOptions,
  'card-corners': hintOptionsWithIncompatible,
  'card-print-sides': hintOptions,
};

export const catalogKeyParam = z.object({
  key: z.enum(Object.keys(CATALOG_GROUP_SCHEMAS) as [string, ...string[]]),
});

export const replaceCatalogBody = z.object({
  label: labelString.optional(),
  data: z.unknown(),
});
export type ReplaceCatalogBody = z.infer<typeof replaceCatalogBody>;
