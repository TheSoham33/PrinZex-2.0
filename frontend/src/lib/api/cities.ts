import { getList, patch, post } from './client';

/** City registry client (storefront picker + admin management). */

export type SpeedKey = 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP';

export interface CityInfo {
  slug: string;
  name: string;
  active: boolean;
  /** Per-city overrides; null = platform Settings → Platform values. */
  deliveryFees: Partial<Record<SpeedKey, number>> | null;
  deliveryEtaHours: Partial<Record<SpeedKey, number>> | null;
}

export interface AdminCityRow extends CityInfo {
  pincodes: number;
}

/** Public: active cities (storefront picker, coverage forms). */
export const fetchActiveCities = (): Promise<CityInfo[]> => getList<CityInfo>('/cities');

/** Admin: full registry with pincode usage counts. */
export const fetchAllCities = (): Promise<AdminCityRow[]> => getList<AdminCityRow>('/admin/cities');

export const createCity = (name: string): Promise<CityInfo> =>
  post<CityInfo>('/admin/cities', { name });

export const updateCity = (
  slug: string,
  input: {
    name?: string;
    active?: boolean;
    deliveryFees?: Record<string, number> | null;
    deliveryEtaHours?: Record<string, number> | null;
  },
): Promise<CityInfo> => patch<CityInfo>(`/admin/cities/${slug}`, input);
