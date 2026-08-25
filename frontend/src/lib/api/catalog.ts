import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';

/**
 * Admin-managed customization catalogue. One fetch serves every surface
 * (React Query caches it app-wide); each consumer falls back to its shipped
 * constant until the database answers, so the UI never blocks on the API.
 */

export interface CatalogEntryDto {
  key: string;
  label: string;
  data: unknown[];
  updatedAt?: string;
}

export type CatalogMap = Record<string, CatalogEntryDto>;

export const fetchCatalog = async (): Promise<CatalogMap> => {
  const res = await apiRequest<CatalogMap>('/catalog');
  return ((res as { data?: CatalogMap })?.data ?? res) as CatalogMap;
};

/**
 * Options for one catalogue group (`paper-types`, `twin-loop-wire-colors`,
 * `service-categories`, …). Returns the shipped `fallback` while loading or
 * if the database row is missing/empty — callers behave exactly as before
 * until an admin edit lands in the database.
 */
export function useCatalogOptions<T>(key: string, fallback: readonly T[]): T[] {
  const { data } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 30_000,
    retry: 1,
  });
  const raw = data?.[key]?.data;
  return Array.isArray(raw) && raw.length > 0 ? (raw as T[]) : [...fallback];
}

/* ------------------------------ Admin writes ----------------------------- */

export const adminFetchCatalog = async (): Promise<CatalogMap> => {
  const res = await apiRequest<CatalogMap>('/admin/catalog');
  return ((res as { data?: CatalogMap })?.data ?? res) as CatalogMap;
};

export const adminSaveCatalogEntry = async (payload: {
  key: string;
  data: unknown[];
}): Promise<CatalogEntryDto> => {
  const res = await apiRequest<{ data?: CatalogEntryDto }>(
    `/admin/catalog/${payload.key}`,
    {
      method: 'PUT',
      body: JSON.stringify({ data: payload.data }),
    },
  );
  return ((res as { data?: CatalogEntryDto })?.data ?? res) as CatalogEntryDto;
};
