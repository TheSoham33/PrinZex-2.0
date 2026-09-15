import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { isValidPincode, normalizePincode } from '../../utils/pincodes';

/**
 * Pincode registry — the single source of truth for delivery geography.
 * Cities come from the City registry (no free text); zone labels are
 * display-only. Stores and riders reference serviceable rows only, so all
 * coverage matching is an exact pincode equality.
 */

export interface RegistryEntry {
  pincode: string;
  citySlug: string;
  cityName: string;
  zoneLabel: string;
  serviceable: boolean;
}

function serialize(row: {
  pincode: string;
  citySlug: string;
  zoneLabel: string;
  serviceable: boolean;
  registryCity?: { name: string } | null;
  city?: { name: string } | null;
}): RegistryEntry {
  return {
    pincode: row.pincode,
    citySlug: row.citySlug,
    cityName: (row.city ?? row.registryCity)?.name ?? row.citySlug,
    zoneLabel: row.zoneLabel,
    serviceable: row.serviceable,
  };
}

export async function listRegistry(): Promise<Array<RegistryEntry & { stores: number; riders: number }>> {
  const rows = await prisma.pincode.findMany({
    orderBy: [{ citySlug: 'asc' }, { zoneLabel: 'asc' }, { pincode: 'asc' }],
    include: {
      city: { select: { name: true } },
      _count: { select: { sellerCoverages: true, riderCoverages: true } },
    },
  });
  return rows.map((row) => ({
    ...serialize(row),
    stores: row._count.sellerCoverages,
    riders: row._count.riderCoverages,
  }));
}

/** Public picker source: only serviceable pincodes, light payload. */
export async function listServiceablePincodes(): Promise<RegistryEntry[]> {
  const rows = await prisma.pincode.findMany({
    where: { serviceable: true },
    orderBy: [{ citySlug: 'asc' }, { zoneLabel: 'asc' }, { pincode: 'asc' }],
    include: { city: { select: { name: true } } },
  });
  return rows.map((row) => serialize(row));
}

export async function createRegistryEntry(input: {
  pincode: string;
  citySlug: string;
  zoneLabel: string;
  serviceable?: boolean;
}): Promise<RegistryEntry> {
  const pincode = normalizePincode(input.pincode);
  if (!pincode) throw ApiError.badRequest('Pincode must be exactly 6 digits');
  const zoneLabel = input.zoneLabel?.trim();
  if (!zoneLabel) throw ApiError.badRequest('Zone label is required (e.g. "Salt Lake")');
  const citySlug = input.citySlug?.trim();
  const city = await prisma.city.findUnique({ where: { slug: citySlug } });
  if (!city) throw ApiError.badRequest('Pick a city from the city registry');

  const existing = await prisma.pincode.findUnique({ where: { pincode } });
  if (existing) {
    throw ApiError.conflict(`Pincode ${pincode} is already in the registry — edit it instead`);
  }

  const row = await prisma.pincode.create({
    data: { pincode, citySlug, zoneLabel, serviceable: input.serviceable !== false },
    include: { city: { select: { name: true } } },
  });
  return serialize(row);
}

export async function updateRegistryEntry(
  pincodeRaw: string,
  input: { citySlug?: string; zoneLabel?: string; serviceable?: boolean },
): Promise<RegistryEntry> {
  const pincode = normalizePincode(pincodeRaw);
  if (!pincode) throw ApiError.badRequest('Pincode must be exactly 6 digits');

  const existing = await prisma.pincode.findUnique({ where: { pincode } });
  if (!existing) throw ApiError.notFound(`Pincode ${pincode} is not in the registry`);

  if (input.citySlug !== undefined) {
    const city = await prisma.city.findUnique({ where: { slug: input.citySlug.trim() } });
    if (!city) throw ApiError.badRequest('Pick a city from the city registry');
  }

  const zoneLabel = input.zoneLabel !== undefined ? input.zoneLabel.trim() : undefined;
  if (zoneLabel === '') throw ApiError.badRequest('Zone label cannot be empty');

  const row = await prisma.pincode.update({
    where: { pincode },
    data: {
      ...(input.citySlug !== undefined ? { citySlug: input.citySlug.trim() } : {}),
      ...(zoneLabel !== undefined && zoneLabel !== '' ? { zoneLabel } : {}),
      ...(input.serviceable !== undefined ? { serviceable: input.serviceable } : {}),
    },
    include: { city: { select: { name: true } } },
  });
  return serialize(row);
}

/** Assert every pincode exists in the registry and is serviceable. */
export async function assertServiceable(pincodes: string[]): Promise<void> {
  if (pincodes.length === 0) return;
  const rows = await prisma.pincode.findMany({ where: { pincode: { in: pincodes } } });
  const byCode = new Map(rows.map((row) => [row.pincode, row]));
  const problems: string[] = [];
  for (const code of pincodes) {
    const row = byCode.get(code);
    if (!row) problems.push(`${code} (not in registry)`);
    else if (!row.serviceable) problems.push(`${code} (${row.zoneLabel} — marked unserviceable)`);
  }
  if (problems.length > 0) {
    throw ApiError.badRequest(`Pincodes not serviceable on the platform registry: ${problems.join(', ')}`);
  }
}

/** Replace a rider's coverage with registry pincodes (exact, validated). */
export async function setRiderCoverage(
  deliveryBoyId: string,
  pincodes: string[],
): Promise<RegistryEntry[]> {
  const boy = await prisma.deliveryBoy.findUnique({ where: { id: deliveryBoyId } });
  if (!boy) throw ApiError.notFound('Delivery partner not found');

  const cleaned: string[] = [];
  for (const raw of pincodes) {
    const code = normalizePincode(raw);
    if (!code) throw ApiError.badRequest(`"${String(raw)}" is not a valid 6-digit pincode`);
    if (!cleaned.includes(code)) cleaned.push(code);
  }
  await assertServiceable(cleaned);

  await prisma.$transaction([
    prisma.deliveryBoyPincode.deleteMany({ where: { deliveryBoyId } }),
    ...(cleaned.length > 0
      ? [
          prisma.deliveryBoyPincode.createMany({
            data: cleaned.map((pincode) => ({ deliveryBoyId, pincode })),
          }),
        ]
      : []),
  ]);

  const rows = await prisma.deliveryBoyPincode.findMany({
    where: { deliveryBoyId },
    include: { registry: { include: { city: { select: { name: true } } } } },
  });
  return rows.map((row) =>
    serialize({
      pincode: row.pincode,
      citySlug: row.registry.citySlug,
      zoneLabel: row.registry.zoneLabel,
      serviceable: row.registry.serviceable,
      city: row.registry.city,
    }),
  );
}

export { isValidPincode };
