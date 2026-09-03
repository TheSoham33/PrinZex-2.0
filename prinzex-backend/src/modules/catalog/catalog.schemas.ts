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

/** Finishing add-ons — fixed per-unit price. */
const finishingOption = z.object({
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
    finishingOption.extend({
      hint: z.string().trim().max(200).optional(),
    }),
  )
  .refine((rows) => rows[0]?.value === 'loose' && rows[0].price === 0, {
    message: "Keep a free 'loose' (Loose Sheet) row first",
  });

/** Colour swatches — Tailwind class / hex / premium flag. */
const swatchOption = z.object({
  value: keyString,
  label: labelString,
  class: z.string().trim().max(80).optional(),
  hex: z.string().trim().max(9).optional(),
  premium: z.boolean().optional(),
});

const serviceCategories = z.array(
  z.object({
    id: keyString,
    name: labelString,
    description: z.string().trim().max(200).optional(),
    services: z
      .array(z.object({ id: keyString, name: labelString }))
      .min(1, 'A category needs at least one service'),
  }),
);

/** Corners-style options — may declare shapes they can't combine with. */
const hintOptionWithIncompatible = hintOption.extend({
  incompatibleWith: z.array(keyString).optional(),
});

const hintOptions = z.array(hintOption);
const hintOptionsWithIncompatible = z.array(hintOptionWithIncompatible);
const multiplierOptions = z.array(multiplierOption);
const finishingOptions = z.array(finishingOption);
const swatchOptions = z.array(swatchOption);

export const CATALOG_GROUP_SCHEMAS: Record<string, z.ZodType<unknown>> = {
  'service-categories': serviceCategories,
  'paper-types': multiplierOptions,
  'paper-sizes': multiplierOptions,
  'finishing-options': finishingOptions,
  'stapling-options': staplingOptions,
  'cover-types': hintOptions,
  'spiral-coil-types': hintOptions,
  'spiral-cover-types': hintOptions,
  'cover-colors': swatchOptions,
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
