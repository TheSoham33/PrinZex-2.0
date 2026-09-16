import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import {
  citySlugFromName,
  parseBoundedNumber,
  SETTING_BOUNDS,
  SPEED_KEYS,
  type DeliverySpeedKey,
} from '../../utils/platformSettings';

/** Lenient per-key parser for PARTIAL overrides: unknown speeds are dropped
 *  (they fall back to the platform default at read time); invalid values in
 *  a provided speed reject the whole write. */
function parsePartialSpeedMap(
  input: Record<string, unknown>,
  bounds: { min: number; max: number; maxDecimals: number },
): Partial<Record<DeliverySpeedKey, number>> | null {
  const out: Partial<Record<DeliverySpeedKey, number>> = {};
  for (const key of SPEED_KEYS) {
    if (!(key in input)) continue;
    const value = parseBoundedNumber(input[key], bounds.min, bounds.max, bounds.maxDecimals);
    if (value === null) return null;
    out[key] = value;
  }
  return out;
}

/**
 * City registry — the platform's operational cities. The storefront picker
 * lists active rows; pincodes hang off them; optional per-city
 * deliveryFees/deliveryEtaHours overrides layer on the platform defaults
 * (only speeds that diverge need to be present — invalid/missing fall back).
 */

export interface CityRow {
  slug: string;
  name: string;
  active: boolean;
  deliveryFees: Partial<Record<DeliverySpeedKey, number>> | null;
  deliveryEtaHours: Partial<Record<DeliverySpeedKey, number>> | null;
}

function serialize(row: {
  slug: string;
  name: string;
  active: boolean;
  deliveryFees: unknown;
  deliveryEtaHours: unknown;
}): CityRow {
  return {
    slug: row.slug,
    name: row.name,
    active: row.active,
    deliveryFees: (row.deliveryFees as CityRow['deliveryFees']) ?? null,
    deliveryEtaHours: (row.deliveryEtaHours as CityRow['deliveryEtaHours']) ?? null,
  };
}

export async function listActiveCities(): Promise<CityRow[]> {
  const rows = await prisma.city.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return rows.map(serialize);
}

export async function listAllCities(): Promise<Array<CityRow & { pincodes: number }>> {
  const rows = await prisma.city.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { pincodes: true } } },
  });
  return rows.map((row) => ({ ...serialize(row), pincodes: row._count.pincodes }));
}

export async function createCity(input: { name: string }): Promise<CityRow> {
  const name = input.name?.trim();
  if (!name) throw ApiError.badRequest('City name is required');
  const slug = citySlugFromName(name);
  if (!slug) throw ApiError.badRequest('City name is unusable');

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) throw ApiError.conflict(`City "${existing.name}" is already in the registry`);

  const row = await prisma.city.create({ data: { slug, name } });
  return serialize(row);
}

export interface UpdateCityInput {
  name?: string;
  active?: boolean;
  /** Full or partial speed map; null clears the override. */
  deliveryFees?: Record<string, unknown> | null;
  deliveryEtaHours?: Record<string, unknown> | null;
}

export async function updateCity(slugRaw: string, input: UpdateCityInput): Promise<CityRow> {
  const slug = citySlugFromName(slugRaw);
  if (!slug) throw ApiError.badRequest('Unknown city slug');
  const existing = await prisma.city.findUnique({ where: { slug } });
  if (!existing) throw ApiError.notFound('City not found');

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw ApiError.badRequest('City name cannot be empty');
    data.name = name;
  }
  if (input.active !== undefined) data.active = input.active === true;

  // Overrides are PARTIAL by design: only speeds that diverge from the
  // platform default need to be present (the read path merges).
  if (input.deliveryFees !== undefined) {
    if (input.deliveryFees === null) {
      data.deliveryFees = null;
    } else {
      const parsed = parsePartialSpeedMap(input.deliveryFees, SETTING_BOUNDS.deliveryFee);
      if (parsed === null) {
        throw ApiError.badRequest('deliveryFees values must be numbers between 0 and 10000 (at most 2 decimals)');
      }
      data.deliveryFees = parsed;
    }
  }
  if (input.deliveryEtaHours !== undefined) {
    if (input.deliveryEtaHours === null) {
      data.deliveryEtaHours = null;
    } else {
      const parsed = parsePartialSpeedMap(input.deliveryEtaHours, SETTING_BOUNDS.deliveryEtaHours);
      if (parsed === null) {
        throw ApiError.badRequest('deliveryEtaHours values must be whole hours between 1 and 168');
      }
      data.deliveryEtaHours = parsed;
    }
  }

  const row = await prisma.city.update({ where: { slug }, data });
  return serialize(row);
}
