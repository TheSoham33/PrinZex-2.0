import { getList, patch, post } from './client';

/** Pincode registry — single source of truth for delivery geography. */

export interface PincodeRegistryEntry {
  pincode: string;
  city: string;
  zoneLabel: string;
  serviceable: boolean;
}

export interface PincodeRegistryRow extends PincodeRegistryEntry {
  stores: number;
  riders: number;
}

/** Public: serviceable rows only (coverage pickers, area checks). */
export const fetchServiceablePincodes = (): Promise<PincodeRegistryEntry[]> =>
  getList<PincodeRegistryEntry>('/pincodes');

/** Admin: full registry with usage counts. */
export const fetchPincodeRegistry = (): Promise<PincodeRegistryRow[]> =>
  getList<PincodeRegistryRow>('/admin/delivery/pincodes');

export const createPincode = (input: {
  pincode: string;
  city: string;
  zoneLabel: string;
  serviceable?: boolean;
}): Promise<PincodeRegistryEntry> => post<PincodeRegistryEntry>('/admin/delivery/pincodes', input);

export const updatePincode = (
  pincode: string,
  input: { city?: string; zoneLabel?: string; serviceable?: boolean },
): Promise<PincodeRegistryEntry> => patch<PincodeRegistryEntry>(`/admin/delivery/pincodes/${pincode}`, input);

/** Admin: replace a rider's coverage with registry pincodes. */
export const setRiderCoverage = (
  riderId: string,
  pincodes: string[],
): Promise<PincodeRegistryEntry[]> => post<PincodeRegistryEntry[]>(`/admin/delivery/boys/${riderId}/coverage`, { pincodes });

/** Stable picker label: "Salt Lake · 700064". */
export const pincodeOptionLabel = (row: { zoneLabel: string; pincode: string }): string =>
  `${row.zoneLabel} · ${row.pincode}`;
