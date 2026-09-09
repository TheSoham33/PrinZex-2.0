import { get, patch, post } from './client';
import type { DeliveryBoy, DeliveryAuthTokens } from '@/store/slices/deliveryAuthSlice';

/**
 * Delivery partner (rider) API — auth is phone + OTP (no passwords).
 * Every response type mirrors the backend service exactly (see
 * prinzex-backend src/modules/delivery & delivery-auth).
 */

// ── Auth (public) ────────────────────────────────────────────────────────

export const requestDeliveryOtp = async (phone: string): Promise<{ sent: true; devOtp?: string }> =>
  post('/delivery/auth/login', { phone });

export const verifyDeliveryOtp = async (
  phone: string,
  otp: string,
): Promise<{ deliveryBoy: DeliveryBoy; tokens: DeliveryAuthTokens }> =>
  post('/delivery/auth/verify-otp', { phone, otp });

export const deliveryLogoutApi = async (refreshToken?: string): Promise<void> =>
  post('/delivery/auth/logout', refreshToken ? { refreshToken } : {});

// ── Registration (public) ────────────────────────────────────────────────

export interface RegisterDeliveryInput {
  name: string;
  phone: string; // exactly 10 digits
  email?: string;
  city: string;
  vehicleType: 'bike' | 'scooter' | 'car';
  vehicleRegNo: string;
  licenseNumber: string;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string; // 9–18 digits
    ifscCode: string; // e.g. HDFC0001234
  };
}

export const registerDeliveryPartner = async (input: RegisterDeliveryInput): Promise<{ message: string }> =>
  post('/delivery/register', input);

// ── Profile ──────────────────────────────────────────────────────────────

export interface DeliveryProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  status: string;
  isOnline: boolean;
  vehicleType: string;
  vehicleRegNo: string;
  licenseNumber: string;
  averageRating: number;
  totalDeliveries: number;
  onTimeRate: number;
  pendingEarnings: number;
  totalEarnings: number;
  bankDetails: {
    accountHolderName: string;
    accountNumberMasked: string;
    ifscCode: string;
  } | null;
  zones: string[];
  documents: { id: string; docType: string; isVerified: boolean; uploadedAt: string }[];
  createdAt: string;
}

export const fetchDeliveryProfile = async (): Promise<DeliveryProfile> => get('/delivery/profile');

export const updateDeliveryProfile = async (data: {
  name?: string;
  email?: string | null;
  city?: string;
  vehicleType?: 'bike' | 'scooter' | 'car';
}): Promise<DeliveryProfile> => patch('/delivery/profile', data);

export const updateDeliveryBank = async (data: {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}): Promise<unknown> => patch('/delivery/profile/bank', data);

// ── Availability ─────────────────────────────────────────────────────────

export const setDeliveryAvailability = async (isOnline: boolean): Promise<{ isOnline: boolean }> =>
  patch('/delivery/availability', { isOnline });

// ── Active delivery workflow ─────────────────────────────────────────────

export interface ActiveDelivery {
  id: string;
  status: 'assigned' | 'picked_up' | 'out_for_delivery' | string;
  pickedUpAt: string | null;
  order: {
    id: string;
    status: string;
    total: number;
    paymentMethod: string;
    services: string[];
    specialInstructions: string | null;
  };
  customer: { name: string; maskedPhone: string };
  pickup: {
    storeName: string;
    address: string;
    city: string;
    pincode: string;
    lat: number | null;
    lng: number | null;
    phone: string;
  };
  drop: {
    label?: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    lat: number | null;
    lng: number | null;
  } | null;
}

export const fetchActiveDelivery = async (): Promise<ActiveDelivery> => get('/delivery/active-delivery');

export const pingDeliveryLocation = async (lat: number, lng: number): Promise<{ etaMinutes: number | null }> =>
  patch('/delivery/active-delivery/location', { lat, lng });

export const confirmDeliveryPickup = async (): Promise<{ deliveryId: string; status: string }> =>
  patch('/delivery/active-delivery/pickup-confirm');

export const confirmDeliveryDone = async (otpProvided: string): Promise<{ deliveryId: string; status: string; earned: number }> =>
  patch('/delivery/active-delivery/deliver', { otpProvided });

export const failActiveDelivery = async (reason: string): Promise<unknown> =>
  patch('/delivery/active-delivery/fail', { reason });

// ── Earnings & payouts ───────────────────────────────────────────────────

export type EarningsPeriod = '7d' | '30d' | 'this_month';

export interface RiderEarnings {
  period: EarningsPeriod;
  totalEarnings: number;
  deliveryCount: number;
  averagePerDelivery: number;
  pendingEarnings: number;
  lifetimeEarnings: number;
  lifetimeDeliveries: number;
  earningsByDay: { date: string; earnings: number; deliveries: number }[];
}

export const fetchDeliveryEarnings = async (period: EarningsPeriod): Promise<RiderEarnings> =>
  get('/delivery/earnings', { period });

export interface RiderPayout {
  id: string;
  status: string;
  amount: number;
  deliveriesIncluded: number;
  bankAccount: unknown;
  initiatedAt: string | null;
  processedAt: string | null;
  failReason: string | null;
  createdAt: string;
}

export const fetchDeliveryPayouts = async (
  page = 1,
): Promise<{ data: RiderPayout[]; pagination: { total: number; hasNext: boolean } }> =>
  get('/delivery/payouts', { page, limit: 10 });

export const requestDeliveryPayout = async (): Promise<unknown> => post('/delivery/payouts/request');
