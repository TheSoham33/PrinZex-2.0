import * as T from '../types';

export type PriceRange = T.PriceRange;
export type Store = T.Store;
export type StoreHours = T.StoreHours;
export type ServiceOffering = T.ServiceOffering;
export type Review = T.Review;
export type StoreDetail = T.StoreDetail;
export type OrderSpecifications = T.OrderSpecifications;
export type DeliverySpeed = T.DeliverySpeed;
export type PaymentMethod = T.PaymentMethod;
export type UploadedFile = T.UploadedFile;
export type DeliveryAddress = T.DeliveryAddress;
export type CostBreakdown = T.CostBreakdown;
export type Order = T.Order;

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_HOURS: T.StoreHours[] = [
  { day: 'Monday', open: '09:00', close: '21:00' },
  { day: 'Tuesday', open: '09:00', close: '21:00' },
  { day: 'Wednesday', open: '09:00', close: '21:00' },
  { day: 'Thursday', open: '09:00', close: '21:00' },
  { day: 'Friday', open: '09:00', close: '21:00' },
  { day: 'Saturday', open: '10:00', close: '18:00' },
  { day: 'Sunday', closed: true },
];

export interface DeliveryOption {
  key: T.DeliverySpeed;
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

export const TAX_RATE = 0.18;

export const BINDING_CORNER_SIZES = [
  { value: 'small', label: 'Small', hint: 'Rounded 5mm' },
  { value: 'medium', label: 'Medium', hint: 'Rounded 10mm' },
  { value: 'sharp', label: 'Sharp', hint: 'Square corners' },
];

export const COVER_COLORS = [
  { value: 'navy', label: 'Navy Blue', class: 'bg-[#000080]' },
  { value: 'maroon', label: 'Maroon', class: 'bg-[#800000]' },
  { value: 'black', label: 'Black', class: 'bg-black' },
  { value: 'green', label: 'Dark Green', class: 'bg-[#006400]' },
];

export const COVER_TEXT_COLORS = [
  { value: 'gold', label: 'Gold Foil', class: 'bg-[#D4AF37]' },
  { value: 'silver', label: 'Silver Foil', class: 'bg-[#C0C0C0]' },
  { value: 'white', label: 'White', class: 'bg-white' },
];

export const COVER_TYPES = [
  { value: 'leather', label: 'Leatherette', hint: 'Premium textured finish' },
  { value: 'matte', label: 'Matte Laminated', hint: 'Smooth non-reflective' },
  { value: 'rexine', label: 'Rexine', hint: 'Durable classic finish' },
];

export const SPIRAL_COIL_TYPES = [
  { value: 'plastic', label: 'Plastic Coil', hint: 'Flexible & durable' },
  { value: 'wire-o', label: 'Wire-O (Metal)', hint: 'Professional, lays flat' },
];

export const SPIRAL_COVER_TYPES = [
  { value: 'clear', label: 'Clear Plastic', hint: 'Transparent front' },
  { value: 'frosted', label: 'Frosted Plastic', hint: 'Semi-transparent matte' },
  { value: 'printed', label: 'Printed Cardstock', hint: 'Full color printed cover' },
  { value: 'opaque', label: 'Opaque Cardstock', hint: 'Solid color heavy paper' },
];

/* ------------------------------------------------------------------ */
/* Mock data (REMOVED)                                                 */
/* ------------------------------------------------------------------ */

export const MOCK_STORES: T.Store[] = [];
export const MOCK_STORE_DETAILS: T.StoreDetail[] = [];
export const MOCK_ADDRESSES: T.DeliveryAddress[] = [];

export function getStoreById(id: string): T.StoreDetail | undefined {
  return undefined;
}

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
