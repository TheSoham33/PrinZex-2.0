import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { isValidPincode, normalizePincode } from '../../utils/pincodes';

/**
 * Pincode registry — the single source of truth for delivery geography.
 * Admins curate the list (pincode + city + display-only zone label +
 * serviceable switch); stores and riders can only reference existing
 * serviceable rows, so coverage matching is always an exact pincode
 * equality and free-text zones can never re-enter the system.
 */

export interface RegistryEntry {
  pincode: string;
  city: string;
  zoneLabel: string;
  serviceable: boolean;
}

export async function listRegistry(): Promise<Array<RegistryEntry & { stores: number; riders: number }>> {
  const rows = await prisma.pincode.findMany({
    orderBy: [{ city: 'asc' }, { zoneLabel: 'asc' }, { pincode: 'asc' }],
    include: {
      _count: { select: { sellerCoverages: true, riderCoverages: true } },
    },
  });
  return rows.map((row) => ({
    pincode: row.pincode,
    city: row.city,
    zoneLabel: row.zoneLabel,
    serviceable: row.serviceable,
    stores: row._count.sellerCoverages,
    riders: row._count.riderCoverages,
  }));
}

/** Public picker source: only serviceable pincodes, light payload. */
export async function listServiceablePincodes(): Promise<RegistryEntry[]> {
  const rows = await prisma.pincode.findMany({
    where: { serviceable: true },
    orderBy: [{ city: 'asc' }, { zoneLabel: 'asc' }, { pincode: 'asc' }],
  });
  return rows.map((row) => ({
    pincode: row.pincode,
    city: row.city,
    zoneLabel: row.zoneLabel,
    serviceable: row.serviceable,
  }));
}

export async function createRegistryEntry(
  input: { pincode: string; city: string; zoneLabel: string; serviceable?: boolean },
): Promise<RegistryEntry> {
  const pincode = normalizePincode(input.pincode);
  if (!pincode) {
    throw ApiError.badRequest('Pincode must be exactly 6 digits');
  }
  const city = input.city?.trim();
  const zoneLabel = input.zoneLabel?.trim();
  if (!city) throw ApiError.badRequest('City is required');
  if (!zoneLabel) throw ApiError.badRequest('Zone label is required (e.g. "Salt Lake")');

  const existing = await prisma.pincode.findUnique({ where: { pincode } });
  if (existing) {
    throw ApiError.conflict(`Pincode ${pincode} is already in the registry — edit it instead`);
  }

  const row = await prisma.pincode.create({
    data: { pincode, city, zoneLabel, serviceable: input.serviceable !== false },
  });
  return { pincode: row.pincode, city: row.city, zoneLabel: row.zoneLabel, serviceable: row.serviceable };
}

export async function updateRegistryEntry(
  pincodeRaw: string,
  input: { city?: string; zoneLabel?: string; serviceable?: boolean },
): Promise<RegistryEntry> {
  const pincode = normalizePincode(pincodeRaw);
  if (!pincode) throw ApiError.badRequest('Pincode must be exactly 6 digits');

  const existing = await prisma.pincode.findUnique({ where: { pincode } });
  if (!existing) throw ApiError.notFound(`Pincode ${pincode} is not in the registry`);

  const city = input.city !== undefined ? input.city.trim() : undefined;
  const zoneLabel = input.zoneLabel !== undefined ? input.zoneLabel.trim() : undefined;
  if (city === '') throw ApiError.badRequest('City cannot be empty');
  if (zoneLabel === '') throw ApiError.badRequest('Zone label cannot be empty');

  const row = await prisma.pincode.update({
    where: { pincode },
    data: {
      ...(city !== undefined && city !== '' ? { city } : {}),
      ...(zoneLabel !== undefined && zoneLabel !== '' ? { zoneLabel } : {}),
      ...(input.serviceable !== undefined ? { serviceable: input.serviceable } : {}),
    },
  });
  return { pincode: row.pincode, city: row.city, zoneLabel: row.zoneLabel, serviceable: row.serviceable };
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
    include: { registry: true },
  });
  return rows.map((row) => ({
    pincode: row.pincode,
    city: row.registry.city,
    zoneLabel: row.registry.zoneLabel,
    serviceable: row.registry.serviceable,
  }));
}

export { isValidPincode };
