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
  {
    value: 'standard',
    label: 'Standard',
    hint: '70 GSM everyday paper',
    multiplier: 1,
  },
  {
    value: 'premium',
    label: 'Premium',
    hint: '100 GSM thick paper',
    multiplier: 1.4,
  },
  {
    value: 'glossy',
    label: 'Glossy',
    hint: 'Shiny photo finish',
    multiplier: 1.8,
  },
  {
    value: 'matte',
    label: 'Matte',
    hint: 'Non-reflective finish',
    multiplier: 1.6,
  },
] as const;

export const PAPER_SIZES = [
  { value: 'A4', label: 'A4', hint: '210 × 297 mm', multiplier: 1 },
  { value: 'A3', label: 'A3', hint: '297 × 420 mm', multiplier: 1.9 },
  { value: 'A2', label: 'A2', hint: '420 × 594 mm', multiplier: 3.4 },
  {
    value: 'custom',
    label: 'Custom',
    hint: 'Tell us in instructions',
    multiplier: 2.2,
  },
] as const;

export const FINISHING_OPTIONS = [
  { value: 'lamination', label: 'Lamination', price: 15 },
  { value: 'spiral-binding', label: 'Spiral binding', price: 40 },
  { value: 'hard-binding', label: 'Hard binding', price: 120 },
  { value: 'stapling', label: 'Stapling', price: 5 },
  { value: 'punching', label: 'Hole punching', price: 8 },
] as const;

export const TAX_RATE = 0.18;

export const COVER_COLORS = [
  { value: 'navy', label: 'Navy Blue', class: 'bg-[#000080]', hex: '#000080' },
  {
    value: 'maroon',
    label: 'Maroon / Crimson',
    class: 'bg-[#800000]',
    hex: '#800000',
  },
  { value: 'black', label: 'Royal Black', class: 'bg-black', hex: '#111111' },
  {
    value: 'green',
    label: 'Dark Emerald Green',
    class: 'bg-[#006400]',
    hex: '#006400',
  },
];

export const COVER_TEXT_COLORS = [
  {
    value: 'gold',
    label: 'Metallic Gold',
    class: 'bg-[#D4AF37]',
    hex: '#D4AF37',
  },
  {
    value: 'silver',
    label: 'Metallic Silver',
    class: 'bg-[#C0C0C0]',
    hex: '#C0C0C0',
  },
  { value: 'white', label: 'White', class: 'bg-white', hex: '#FFFFFF' },
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
  {
    value: 'frosted',
    label: 'Frosted Plastic',
    hint: 'Semi-transparent matte',
  },
  {
    value: 'printed',
    label: 'Printed Cardstock',
    hint: 'Full color printed cover',
  },
  {
    value: 'opaque',
    label: 'Opaque Cardstock',
    hint: 'Solid color heavy paper',
  },
];

export const TWIN_LOOP_WIRE_COLORS = [
  { value: 'black', label: 'Pitch Black', class: 'bg-black', premium: false },
  { value: 'white', label: 'Bright White', class: 'bg-white', premium: false },
  {
    value: 'silver',
    label: 'Metallic Silver',
    class: 'bg-[#C0C0C0]',
    premium: false,
  },
  {
    value: 'gold',
    label: 'Metallic Gold',
    class: 'bg-[#D4AF37]',
    premium: true,
  },
  {
    value: 'rose-gold',
    label: 'Rose Gold',
    class: 'bg-[#B76E79]',
    premium: true,
  },
  {
    value: 'royal-blue',
    label: 'Royal Blue',
    class: 'bg-[#4169E1]',
    premium: true,
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    class: 'bg-[#228B22]',
    premium: true,
  },
  { value: 'bronze', label: 'Bronze', class: 'bg-[#CD7F32]', premium: true },
] as const;

export const TWIN_LOOP_FRONT_COVERS = [
  {
    value: 'clear-gloss',
    label: 'Clear Gloss Acetate / PVC',
    hint: 'Transparent; first printed page remains visible',
  },
  {
    value: 'frosted-matte',
    label: 'Frosted / Matte Polypropylene',
    hint: 'Semi-opaque and scratch resistant',
  },
  {
    value: 'heavy-cardstock',
    label: 'Heavy Cardstock (300+ GSM)',
    hint: 'Printable artwork with matte or gloss lamination',
  },
] as const;

export const TWIN_LOOP_BACK_COVERS = [
  {
    value: 'matching-front',
    label: 'Matching Front',
    hint: 'Use the same style as the selected front cover',
  },
  {
    value: 'vinyl-black',
    label: 'Heavy Vinyl / Leatherette — Black',
    hint: 'Rigid textured backing sheet',
  },
  {
    value: 'vinyl-navy',
    label: 'Heavy Vinyl / Leatherette — Navy',
    hint: 'Rigid textured backing sheet',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
