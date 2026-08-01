/**
 * Store, service and order domain types + mock data.
 *
 * NOTE: `StoreDetail` and `DeliveryAddress` are each declared exactly once here
 * (the duplicate declarations noted in the project docs have been removed).
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

export const MOCK_ADDRESSES: DeliveryAddress[] = [
  {
    id: 'addr-1',
    label: 'Home',
    fullAddress: 'Flat 4B, Green Apartments, Salt Lake, Kolkata 700091',
    phone: '+91 98300 45612',
  },
  {
    id: 'addr-2',
    label: 'Office',
    fullAddress: 'Tech Park, Sector V, Salt Lake, Kolkata 700091',
    phone: '+91 98300 77123',
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
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const REVIEWS_A: Review[] = [
  {
    id: 'r1',
    customerName: 'Ananya Sen',
    avatarInitials: 'AS',
    rating: 5,
    date: '2026-07-12',
    comment:
      'Printed 400 pages of my thesis here. Binding was neat, colours were sharp and they delivered a day earlier than promised. Highly recommended.',
  },
  {
    id: 'r2',
    customerName: 'Rahul Banerjee',
    avatarInitials: 'RB',
    rating: 5,
    date: '2026-07-04',
    comment:
      'Very responsive on WhatsApp. Sent the file at 11 AM and picked up the banners by 4 PM the same day.',
  },
  {
    id: 'r3',
    customerName: 'Priyanka Ghosh',
    avatarInitials: 'PG',
    rating: 4,
    date: '2026-06-27',
    comment:
      'Good quality prints at a fair price. Only reason for 4 stars is the shop gets crowded in the evening.',
  },
  {
    id: 'r4',
    customerName: 'Sourav Das',
    avatarInitials: 'SD',
    rating: 5,
    date: '2026-06-15',
    comment: 'Xerox rates are the best in Salt Lake. Staff is polite and quick.',
  },
];

const REVIEWS_B: Review[] = [
  {
    id: 'r5',
    customerName: 'Meghna Roy',
    avatarInitials: 'MR',
    rating: 4,
    date: '2026-07-18',
    comment: 'Cheapest B&W xerox around. Print quality is decent for study material.',
  },
  {
    id: 'r6',
    customerName: 'Arjun Mitra',
    avatarInitials: 'AM',
    rating: 5,
    date: '2026-07-02',
    comment: 'Got 200 stickers printed for my cafe. Colours matched my design file exactly.',
  },
  {
    id: 'r7',
    customerName: 'Tanisha Paul',
    avatarInitials: 'TP',
    rating: 3,
    date: '2026-06-20',
    comment: 'Prints were fine but delivery took longer than the estimate on a weekend.',
  },
];

const REVIEWS_C: Review[] = [
  {
    id: 'r8',
    customerName: 'Vikram Agarwal',
    avatarInitials: 'VA',
    rating: 5,
    date: '2026-07-21',
    comment:
      'Premium business cards with spot UV — genuinely studio quality. Worth every rupee for client meetings.',
  },
  {
    id: 'r9',
    customerName: 'Ishita Chatterjee',
    avatarInitials: 'IC',
    rating: 5,
    date: '2026-07-09',
    comment:
      'Had 12 fine-art prints made for an exhibition. Colour calibration was spot on and they packed each one separately.',
  },
  {
    id: 'r10',
    customerName: 'Nikhil Saha',
    avatarInitials: 'NS',
    rating: 5,
    date: '2026-06-30',
    comment: 'Expensive but you get exactly what you pay for. The matte photo paper is gorgeous.',
  },
  {
    id: 'r11',
    customerName: 'Debolina Bose',
    avatarInitials: 'DB',
    rating: 4,
    date: '2026-06-11',
    comment: 'Lovely finish on the wedding invites. Slightly slow to respond during peak season.',
  },
];

const SERVICES_A: ServiceOffering[] = [
  {
    id: 'svc-a1',
    name: 'Colour Printing',
    icon: 'file',
    startingPrice: 8,
    unit: 'per page',
    description: 'Vibrant colour prints on 70–100 GSM paper, A4 and A3.',
  },
  {
    id: 'svc-a2',
    name: 'B&W Xerox',
    icon: 'file',
    startingPrice: 1,
    unit: 'per page',
    description: 'High-speed black & white photocopying with auto sorting.',
  },
  {
    id: 'svc-a3',
    name: 'Vinyl Banners',
    icon: 'flag',
    startingPrice: 45,
    unit: 'per sq ft',
    description: 'Weatherproof outdoor vinyl banners with eyelets.',
  },
  {
    id: 'svc-a4',
    name: 'Lamination',
    icon: 'badge',
    startingPrice: 15,
    unit: 'per piece',
    description: 'Glossy or matte lamination up to A3 size.',
  },
  {
    id: 'svc-a5',
    name: 'Spiral Binding',
    icon: 'badge',
    startingPrice: 40,
    unit: 'per piece',
    description: 'Plastic comb or metal spiral binding for reports.',
  },
];

const SERVICES_B: ServiceOffering[] = [
  {
    id: 'svc-b1',
    name: 'B&W Printing',
    icon: 'file',
    startingPrice: 1,
    unit: 'per page',
    description: 'Budget-friendly bulk printing for notes and study material.',
  },
  {
    id: 'svc-b2',
    name: 'Colour Printing',
    icon: 'file',
    startingPrice: 6,
    unit: 'per page',
    description: 'Everyday colour printing at student-friendly rates.',
  },
  {
    id: 'svc-b3',
    name: 'Custom Stickers',
    icon: 'tag',
    startingPrice: 4,
    unit: 'per piece',
    description: 'Die-cut vinyl stickers in any shape, min. 50 pieces.',
  },
  {
    id: 'svc-b4',
    name: 'Document Scanning',
    icon: 'file',
    startingPrice: 2,
    unit: 'per page',
    description: 'High-resolution scanning to PDF, emailed instantly.',
  },
];

const SERVICES_C: ServiceOffering[] = [
  {
    id: 'svc-c1',
    name: 'Premium Business Cards',
    icon: 'id',
    startingPrice: 3,
    unit: 'per piece',
    description: '350 GSM cards with spot UV, foiling or embossing.',
  },
  {
    id: 'svc-c2',
    name: 'Fine Art Prints',
    icon: 'image',
    startingPrice: 250,
    unit: 'per piece',
    description: 'Archival giclée prints on cotton rag paper.',
  },
  {
    id: 'svc-c3',
    name: 'Wedding Invitations',
    icon: 'badge',
    startingPrice: 35,
    unit: 'per piece',
    description: 'Letterpress and foil-stamped invitation suites.',
  },
  {
    id: 'svc-c4',
    name: 'Large Format Banners',
    icon: 'flag',
    startingPrice: 80,
    unit: 'per sq ft',
    description: 'Backlit and fabric banners for events and expos.',
  },
  {
    id: 'svc-c5',
    name: 'Photo Prints',
    icon: 'image',
    startingPrice: 25,
    unit: 'per piece',
    description: 'Lustre, glossy and matte photo prints up to A2.',
  },
];

/**
 * Full store records. Every store in the listing has a detail page so no card
 * ever leads to a dead end — `NotFoundState` covers genuinely unknown IDs.
 */
export const MOCK_STORE_DETAILS: StoreDetail[] = [
  {
    id: '1',
    name: 'Print Master Pro',
    imageUrl: '',
    rating: 4.8,
    reviewCount: 120,
    distanceKm: 1.2,
    etaLabel: '30–45 min',
    priceRange: '$$',
    tags: ['Documents', 'Banners', 'Xerox'],
    verified: true,
    description:
      'A full-service print shop in Salt Lake serving students, startups and event organisers since 2011. We run two colour laser presses and a wide-format plotter in house, so most document jobs are ready within the hour.',
    address: '23A, BD Block, Sector 1, Salt Lake City, Kolkata 700064',
    phone: '+91 98300 12345',
    email: 'hello@printmasterpro.in',
    responseTime: 'Replies in ~10 min',
    hours: DEFAULT_HOURS,
    services: SERVICES_A,
    reviews: REVIEWS_A,
    ratingBreakdown: { 5: 78, 4: 15, 3: 5, 2: 1, 1: 1 },
  },
  {
    id: '2',
    name: 'Quick Copy Hub',
    imageUrl: '',
    rating: 4.2,
    reviewCount: 85,
    distanceKm: 0.8,
    etaLabel: '20–30 min',
    priceRange: '$',
    tags: ['Documents', 'Stickers'],
    verified: true,
    description:
      'The go-to xerox counter next to the college gate. Known for the lowest per-page rates in the neighbourhood and a queue that moves fast. Great for bulk notes, forms and last-minute submissions.',
    address: '7/1, Kestopur Main Road, Kolkata 700102',
    phone: '+91 98311 55210',
    email: 'quickcopyhub@gmail.com',
    responseTime: 'Replies in ~25 min',
    hours: DEFAULT_HOURS,
    services: SERVICES_B,
    reviews: REVIEWS_B,
    ratingBreakdown: { 5: 52, 4: 29, 3: 12, 2: 5, 1: 2 },
  },
  {
    id: '3',
    name: 'Elite Press Studio',
    imageUrl: '',
    rating: 4.9,
    reviewCount: 210,
    distanceKm: 3.4,
    etaLabel: '1–2 hours',
    priceRange: '$$$',
    tags: ['Business cards', 'Photo prints', 'Banners'],
    verified: true,
    description:
      'A boutique press for people who care about paper. We specialise in letterpress, foil stamping and archival giclée printing, with a colour-managed workflow and hand-finished packaging on every order.',
    address: '14 Park Street, Near Park Mansions, Kolkata 700016',
    phone: '+91 98304 88991',
    email: 'studio@elitepress.co.in',
    responseTime: 'Replies in ~15 min',
    hours: DEFAULT_HOURS,
    services: SERVICES_C,
    reviews: REVIEWS_C,
    ratingBreakdown: { 5: 88, 4: 9, 3: 2, 2: 1, 1: 0 },
  },
  {
    id: '4',
    name: 'Campus Print Point',
    imageUrl: '',
    rating: 4.4,
    reviewCount: 64,
    distanceKm: 1.9,
    etaLabel: '30–40 min',
    priceRange: '$',
    tags: ['Documents', 'Xerox', 'Binding'],
    verified: false,
    description:
      'Student-focused print counter opposite Jadavpur University with project binding, ID card printing and overnight bulk xerox at flat rates.',
    address: '188 Raja S C Mallick Road, Jadavpur, Kolkata 700032',
    phone: '+91 98362 41007',
    email: 'campusprintpoint@gmail.com',
    responseTime: 'Replies in ~30 min',
    hours: DEFAULT_HOURS,
    services: [SERVICES_B[0], SERVICES_B[1], SERVICES_A[4], SERVICES_A[3]],
    reviews: REVIEWS_B.slice(0, 2),
    ratingBreakdown: { 5: 58, 4: 26, 3: 11, 2: 3, 1: 2 },
  },
  {
    id: '5',
    name: 'ColorWorks Digital',
    imageUrl: '',
    rating: 4.6,
    reviewCount: 143,
    distanceKm: 2.6,
    etaLabel: '45–60 min',
    priceRange: '$$',
    tags: ['Photo prints', 'Banners', 'Stickers'],
    verified: true,
    description:
      'Digital printing house with an eco-solvent large format printer. Popular for exhibition standees, canvas prints and short-run packaging labels.',
    address: '52 Gariahat Road, Ballygunge, Kolkata 700019',
    phone: '+91 98745 33218',
    email: 'orders@colorworksdigital.in',
    responseTime: 'Replies in ~20 min',
    hours: DEFAULT_HOURS,
    services: [SERVICES_C[4], SERVICES_A[2], SERVICES_B[2], SERVICES_A[0]],
    reviews: [REVIEWS_A[1], REVIEWS_C[2]],
    ratingBreakdown: { 5: 70, 4: 20, 3: 6, 2: 3, 1: 1 },
  },
  {
    id: '6',
    name: 'Howrah Print House',
    imageUrl: '',
    rating: 4.1,
    reviewCount: 47,
    distanceKm: 6.1,
    etaLabel: '2–3 hours',
    priceRange: '$',
    tags: ['Documents', 'Bulk printing'],
    verified: false,
    description:
      'Long-running offset and digital press handling high-volume jobs — question papers, brochures, billbooks and NCR forms for local businesses.',
    address: '31 GT Road, Salkia, Howrah 711106',
    phone: '+91 98315 90042',
    email: 'howrahprinthouse@rediffmail.com',
    responseTime: 'Replies in ~1 hour',
    hours: DEFAULT_HOURS,
    services: [SERVICES_B[0], SERVICES_A[0], SERVICES_A[4]],
    reviews: [REVIEWS_B[2]],
    ratingBreakdown: { 5: 45, 4: 30, 3: 16, 2: 6, 1: 3 },
  },
  {
    id: '7',
    name: 'Signature Stationers',
    imageUrl: '',
    rating: 4.7,
    reviewCount: 96,
    distanceKm: 4.2,
    etaLabel: '1–2 hours',
    priceRange: '$$',
    tags: ['Business cards', 'Documents', 'Letterheads'],
    verified: true,
    description:
      'Corporate stationery specialists producing letterheads, envelopes, invoice books and visiting cards with consistent brand colours across reprints.',
    address: '9 Camac Street, Kolkata 700017',
    phone: '+91 98301 27788',
    email: 'sales@signaturestationers.in',
    responseTime: 'Replies in ~15 min',
    hours: DEFAULT_HOURS,
    services: [SERVICES_C[0], SERVICES_A[0], SERVICES_A[3]],
    reviews: [REVIEWS_C[0], REVIEWS_A[2]],
    ratingBreakdown: { 5: 74, 4: 18, 3: 5, 2: 2, 1: 1 },
  },
  {
    id: '8',
    name: 'Rapid Xerox Corner',
    imageUrl: '',
    rating: 3.9,
    reviewCount: 38,
    distanceKm: 0.6,
    etaLabel: '15–25 min',
    priceRange: '$',
    tags: ['Xerox', 'Documents'],
    verified: false,
    description:
      'A no-frills two-machine xerox shop for instant photocopies, lamination and passport photos. Walk in, print, walk out.',
    address: 'Shop 4, City Centre Crossing, Salt Lake, Kolkata 700064',
    phone: '+91 98040 66123',
    email: 'rapidxerox@gmail.com',
    responseTime: 'Replies in ~40 min',
    hours: DEFAULT_HOURS,
    services: [SERVICES_B[0], SERVICES_A[3], SERVICES_B[3]],
    reviews: [REVIEWS_B[0]],
    ratingBreakdown: { 5: 38, 4: 29, 3: 21, 2: 8, 1: 4 },
  },
  {
    id: '9',
    name: 'Banner Bazaar',
    imageUrl: '',
    rating: 4.5,
    reviewCount: 112,
    distanceKm: 5.3,
    etaLabel: '2–4 hours',
    priceRange: '$$',
    tags: ['Banners', 'Large format', 'Stickers'],
    verified: true,
    description:
      'Large-format only. Flex banners, backlit boards, vehicle wraps and pandal branding produced on a 10-foot wide printer with same-day installation options.',
    address: '77 Diamond Harbour Road, Behala, Kolkata 700034',
    phone: '+91 98366 10455',
    email: 'contact@bannerbazaar.in',
    responseTime: 'Replies in ~25 min',
    hours: DEFAULT_HOURS,
    services: [SERVICES_A[2], SERVICES_C[3], SERVICES_B[2]],
    reviews: [REVIEWS_A[1], REVIEWS_B[1]],
    ratingBreakdown: { 5: 66, 4: 24, 3: 6, 2: 3, 1: 1 },
  },
];

/** Lightweight list used by the /stores listing page. */
export const MOCK_STORES: Store[] = MOCK_STORE_DETAILS.map(
  ({
    id,
    name,
    imageUrl,
    rating,
    reviewCount,
    distanceKm,
    etaLabel,
    priceRange,
    tags,
    verified,
  }) => ({
    id,
    name,
    imageUrl,
    rating,
    reviewCount,
    distanceKm,
    etaLabel,
    priceRange,
    tags,
    verified,
  }),
);

export function getStoreById(id: string): StoreDetail | undefined {
  return MOCK_STORE_DETAILS.find((store) => store.id === id);
}

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
