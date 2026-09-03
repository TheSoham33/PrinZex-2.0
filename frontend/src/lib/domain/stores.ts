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
    value: 'digital',
    label: 'Digital Paper',
    hint: '90 GSM smooth digital print paper',
    multiplier: 1.2,
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
  { value: 'A5', label: 'A5', hint: '148 × 210 mm', multiplier: 0.8 },
  { value: 'A3', label: 'A3', hint: '297 × 420 mm', multiplier: 1.9 },
] as const;

export const FINISHING_OPTIONS = [
  { value: 'lamination', label: 'Lamination', price: 15 },
  { value: 'spiral-binding', label: 'Spiral binding', price: 40 },
  { value: 'hard-binding', label: 'Hard / Thesis binding', price: 120 },
  { value: 'punching', label: 'Hole punching', price: 8 },
] as const;

// Document Printing stapling/binding choices (fall back for the DB-managed
// 'stapling-options' catalogue group). Separate from finishing options: it's
// a mandatory radio and sellers set each style's price from their Pricing
// page. 'loose' is the free default every store must offer.
export const STAPLING_OPTIONS = [
  { value: 'loose', label: 'Loose Sheet', hint: 'No binding — sheets stay as-is', price: 0 },
  { value: 'corner-stapling', label: 'Corner Stapling', hint: 'Single staple at the top-left corner', price: 5 },
  { value: 'side-stapling', label: 'Side Stapling', hint: 'Staples along the left edge', price: 10 },
] as const;

// ── Business Cards (fall back for the DB-managed card-* catalogue groups) ──

export const CARD_SHAPES = [
  { value: 'rectangle', label: 'Standard (Rectangle)', hint: 'Classic business card outline' },
  { value: 'classic', label: 'Classic', hint: 'Softly rounded silhouette' },
  { value: 'square', label: 'Square', hint: 'Modern square format' },
  { value: 'leaf', label: 'Leaf', hint: 'Two opposite rounded corners' },
  { value: 'oval', label: 'Oval', hint: 'Fully curved edges' },
  { value: 'circle', label: 'Circle', hint: 'Round die-cut card' },
] as const;

export const CARD_PAPERS = [
  { value: 'glossy', label: 'Glossy', hint: 'Shiny coated stock' },
  { value: 'matte', label: 'Matte', hint: 'Smooth non-reflective stock' },
  { value: 'velvet', label: 'Velvet Touch', hint: 'Soft-touch lamination' },
  { value: 'premium-plus-glossy', label: 'Premium Plus Glossy', hint: 'Thick high-shine stock' },
  { value: 'non-tearable', label: 'Non-Tearable', hint: 'Waterproof synthetic stock' },
  { value: 'spot-uv', label: 'Spot UV', hint: 'Raised gloss highlights' },
  { value: 'pearl', label: 'Pearl', hint: 'Shimmer metallic stock' },
  { value: 'kraft', label: 'Kraft', hint: 'Natural brown recycled stock' },
  { value: 'diamond', label: 'Diamond', hint: 'Glitter finish stock' },
  { value: 'raised-foil', label: 'Raised Foil', hint: 'Embossed metallic accents' },
  { value: 'magnetic', label: 'Magnetic', hint: 'Fridge-magnet backing' },
  { value: 'transparent', label: 'Transparent', hint: 'Frosted plastic stock' },
] as const;

export const CARD_SIZES = [
  { value: 'standard', label: 'Standard', hint: '89 × 51 mm' },
  { value: 'square', label: 'Square', hint: '65 × 65 mm' },
  { value: 'mini', label: 'Mini', hint: '85 × 45 mm' },
] as const;

export const CARD_CORNERS: ReadonlyArray<{
  value: string;
  label: string;
  hint: string;
  /** Shapes this corner style cannot be combined with (e.g. round dies). */
  incompatibleWith?: string[];
}> = [
  { value: 'standard', label: 'Standard', hint: 'Square-cut corners' },
  { value: 'rounded', label: 'Rounded', hint: 'Cut for a smooth finish', incompatibleWith: ['circle', 'oval', 'leaf'] },
];

export const CARD_PRINT_SIDES = [
  { value: 'single', label: 'Single-sided', hint: 'Design on the front only' },
  { value: 'double', label: 'Double-sided', hint: 'Design on front and back' },
] as const;

/**
 * Catalogue serviceId → illustration shown anywhere a service is listed
 * (store detail picker, /services grid, landing scroll). Shared so every
 * surface shows the same picture for the same service.
 */
export const SERVICE_IMAGE_MAP: Record<string, string> = {
  'doc-print': '/images/services/color-print.jpg',
  'doc-xerox': '/images/services/photocopy.jpg',
  'bulk-booklets': '/images/services/booklets.jpg',
  'bulk-brochures': '/images/services/brochures.jpg',
  'bulk-flyers': '/images/services/flyers.jpg',
  'cards-business': '/images/services/business-cards.jpg',
  'pack-stickers': '/images/services/stickers.jpg',
  'pack-labels': '/images/services/labels.jpg',
  'pack-boxes': '/images/services/boxes.jpg',
  'pack-tags': '/images/services/hang-tags.jpg',
  'bind-spiral': '/images/services/spiral-binding.jpg',
  'bind-twin-loop': '/images/services/twin-loop.jpg',
  'bind-hard': '/images/services/hard-binding.jpg',
  'bind-perfect': '/images/services/perfect-binding.jpg',
  'lf-flex-banner': '/images/services/banners.jpg',
  'lf-vinyl': '/images/services/vinyl.jpg',
  'lf-standee': '/images/services/standee.jpg',
  'spec-canvas': '/images/services/canvas.jpg',
  'spec-mugs': '/images/services/mugs.jpg',
  'spec-photo-prints': '/images/services/photo-prints.jpg',
  'spec-tshirts': '/images/services/tshirts.jpg',
};

/** Shown when a service has no dedicated illustration. */
export const DEFAULT_SERVICE_IMAGE = '/images/services/xerox.jpg';

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
