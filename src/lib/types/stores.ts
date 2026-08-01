/**
 * Store, service and order domain types + shared UI configuration constants.
 * This module contains no demo records — store/address data is served from the
 * backend API (`/api/stores`, `/api/addresses`), not hardcoded here.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PriceRange = '$' | '$$' | '$$$';

export interface Store {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  etaLabel: string;
  priceRange: PriceRange;
  tags: string[];
  verified: boolean;
}

/** A single day in a store's opening-hours table. */
export interface StoreHours {
  day: string;
  /** Optional because closed days (e.g. Sunday) omit them. */
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface ServiceOffering {
  id: string;
  name: string;
  /** Key into the icon map in `components/store-detail/ServiceCard`. */
  icon: string;
  startingPrice: number;
  unit: string;
  description: string;
}

export interface Review {
  id: string;
  customerName: string;
  avatarInitials: string;
  rating: number;
  date: string;
  comment: string;
}

export interface StoreDetail extends Store {
  description: string;
  address: string;
  phone: string;
  email: string;
  responseTime: string;
  hours: StoreHours[];
  services: ServiceOffering[];
  reviews: Review[];
  /** Percentage of reviews per star, keyed 5 -> 1. */
  ratingBreakdown: Record<number, number>;
}

export interface OrderSpecifications {
  serviceId: string;
  paperType: 'standard' | 'premium' | 'glossy' | 'matte' | '';
  size: 'A4' | 'A3' | 'A2' | 'custom' | '';
  quantity: number;
  colorOption: 'color' | 'bw';
  finishing: string[];
}

export type DeliverySpeed = 'standard' | 'express' | 'same-day' | 'pickup';
export type PaymentMethod = 'card' | 'upi' | 'wallet' | 'cod';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface DeliveryAddress {
  id: string;
  label: string;
  fullAddress: string;
  phone: string;
}

export interface CostBreakdown {
  subtotal: number;
  rushFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  specifications: OrderSpecifications;
  file: UploadedFile | null;
  specialInstructions: string;
  address: DeliveryAddress | null;
  deliverySpeed: DeliverySpeed;
  estimatedDeliveryDate: string;
  paymentMethod: PaymentMethod;
  costBreakdown: CostBreakdown;
  placedAt: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_HOURS: StoreHours[] = [
  { day: 'Monday', open: '09:00', close: '21:00' },
  { day: 'Tuesday', open: '09:00', close: '21:00' },
  { day: 'Wednesday', open: '09:00', close: '21:00' },
  { day: 'Thursday', open: '09:00', close: '21:00' },
  { day: 'Friday', open: '09:00', close: '21:00' },
  { day: 'Saturday', open: '10:00', close: '18:00' },
  { day: 'Sunday', closed: true },
];

export interface DeliveryOption {
  key: DeliverySpeed;
  label: string;
  cost: number;
  eta: string;
  description: string;
}

export const DELIVERY_SPEEDS: DeliveryOption[] = [
  {
    key: 'standard',
    label: 'Standard Delivery',
    cost: 0,
    eta: '2–3 days',
    description: 'Free delivery to your doorstep',
  },
  {
    key: 'express',
    label: 'Express Delivery',
    cost: 50,
    eta: 'Next day',
    description: 'Delivered by tomorrow evening',
  },
  {
    key: 'same-day',
    label: 'Same-day Delivery',
    cost: 120,
    eta: 'Today',
    description: 'Order before 2 PM for same-day drop',
  },
  {
    key: 'pickup',
    label: 'Store Pickup',
    cost: 0,
    eta: 'Ready in 2 hours',
    description: 'Collect from the shop counter',
  },
];

export const PAPER_TYPES = [
  { value: 'standard', label: 'Standard', hint: '70 GSM everyday paper', multiplier: 1 },
  { value: 'premium', label: 'Premium', hint: '100 GSM thick paper', multiplier: 1.4 },
  { value: 'glossy', label: 'Glossy', hint: 'Shiny photo finish', multiplier: 1.8 },
  { value: 'matte', label: 'Matte', hint: 'Non-reflective finish', multiplier: 1.6 },
] as const;

export const PAPER_SIZES = [
  { value: 'A4', label: 'A4', hint: '210 × 297 mm', multiplier: 1 },
  { value: 'A3', label: 'A3', hint: '297 × 420 mm', multiplier: 1.9 },
  { value: 'A2', label: 'A2', hint: '420 × 594 mm', multiplier: 3.4 },
  { value: 'custom', label: 'Custom', hint: 'Tell us in instructions', multiplier: 2.2 },
] as const;

export const FINISHING_OPTIONS = [
  { value: 'lamination', label: 'Lamination', price: 15 },
  { value: 'spiral-binding', label: 'Spiral binding', price: 40 },
  { value: 'hard-binding', label: 'Hard binding', price: 120 },
  { value: 'stapling', label: 'Stapling', price: 5 },
  { value: 'punching', label: 'Hole punching', price: 8 },
] as const;

/** GST applied to every order. */
export const TAX_RATE = 0.18;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Deterministic gradient stand-in for missing store photography. */
export function storeGradient(id: string): string {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-violet-600',
    'from-orange-500 to-red-600',
  ];
  const index = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradients[index % gradients.length];
}
