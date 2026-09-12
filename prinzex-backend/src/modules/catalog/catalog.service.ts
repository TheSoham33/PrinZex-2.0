import type { CatalogEntry } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { DEFAULT_CATALOG } from './catalog.defaults';
import { CATALOG_GROUP_SCHEMAS } from './catalog.schemas';
import { REDIS_KEYS } from '../../config/redis';
import { invalidateCachePattern } from '../../utils/cache';

/**
 * Insert defaults for any catalogue group the database doesn't know yet.
 * Reading paths call this first, so deploying a new group key is enough —
 * the row materialises on first read with the shipped default content.
 */
export async function ensureCatalogDefaults(): Promise<void> {
  const existing = await prisma.catalogEntry.findMany({ select: { key: true } });
  const present = new Set(existing.map((row) => row.key));
  const missing = Object.entries(DEFAULT_CATALOG).filter(([key]) => !present.has(key));
  if (missing.length === 0) return;
  await prisma.catalogEntry.createMany({
    data: missing.map(([key, group]) => ({
      key,
      label: group.label,
      data: group.data as object[],
    })),
  });
}

/** All groups keyed by their id — the shape every frontend surface consumes. */
export async function getCatalog(): Promise<Record<string, CatalogEntry>> {
  await ensureCatalogDefaults();
  const rows = await prisma.catalogEntry.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

export async function getCatalogEntry(key: string): Promise<CatalogEntry> {
  await ensureCatalogDefaults();
  const row = await prisma.catalogEntry.findUnique({ where: { key } });
  if (!row) {
    throw ApiError.notFound(`Catalogue group "${key}" not found`);
  }
  return row;
}

/** Admin replace: validate the group's schema, then upsert the whole row. */
export async function replaceCatalogEntry(
  key: string,
  input: { label?: string; data?: unknown },
): Promise<CatalogEntry> {
  const group = DEFAULT_CATALOG[key];
  if (!group) {
    throw ApiError.notFound(`Catalogue group "${key}" not found`);
  }
  const schema = CATALOG_GROUP_SCHEMAS[key];
  const parsed = schema.safeParse(input.data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw ApiError.badRequest(
      `Invalid "${group.label}" data: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
    );
  }

  const saved = await prisma.catalogEntry.upsert({
    where: { key },
    create: {
      key,
      label: input.label ?? group.label,
      data: parsed.data as object[],
    },
    update: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      data: parsed.data as object[],
    },
  });

  // The service kill switch affects every storefront: drop the Redis store
  // caches immediately instead of waiting out their TTLs.
  if (key === 'service-categories') {
    // Kill switch + search tags ride on this group — drop store lists,
    // store details and search suggestions so changes apply immediately.
    await Promise.all([
      invalidateCachePattern(REDIS_KEYS.STORE_LIST_PATTERN()),
      invalidateCachePattern('cache:store:*'),
      invalidateCachePattern('cache:suggest:*'),
    ]);
  }

  return saved;
}
