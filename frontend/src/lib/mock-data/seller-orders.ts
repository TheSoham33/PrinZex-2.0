/** Seller-side order domain types + mock queue data. */

export type SellerOrderStatus =
  | 'new'
  | 'placed'
  | 'accepted'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface SellerOrder {
  id: string;
  status: SellerOrderStatus;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  specifications: string;
  fileUrl?: string | null;
  fileName?: string;
  quantity: number;
  total: number;
  deadline: string;
  placedAt: string;
  isRush: boolean;
  specialInstructions: string | null;
}

export const SELLER_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  placed: 'New',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Dispatched',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const SELLER_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  placed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  accepted: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  processing: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ready_for_pickup: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  dispatched: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  out_for_delivery: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  delivered: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  returned: 'bg-slate-100 text-slate-700 ring-slate-600/20',
};

export const SELLER_STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500',
  placed: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  confirmed: 'bg-indigo-500',
  processing: 'bg-amber-500',
  ready_for_pickup: 'bg-purple-500',
  dispatched: 'bg-orange-500',
  out_for_delivery: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-slate-500',
};

/**
 * The forward-only progression a seller drives an order through. Matches the
 * backend state machine: placed → confirmed → processing → ready_for_pickup
 * (delivery takes over from there).
 */
export const SELLER_STATUS_FLOW: SellerOrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
];

export const ACTIVE_STATUSES: SellerOrderStatus[] = [
  'confirmed',
  'processing',
  'ready_for_pickup',
];

export const HISTORY_STATUSES: SellerOrderStatus[] = ['delivered', 'cancelled', 'returned'];

/** Preset rejection reasons shown in the inline reject flow. */
export const REJECTION_REASONS = [
  'Out of stock / material unavailable',
  'Cannot meet the requested deadline',
  'File is unusable or corrupted',
  'Outside our service capability',
];

/**
 * Orders are seeded relative to "now" so the "time since placed" labels and
 * deadline countdowns always look realistic in a demo.
 */
const now = Date.now();
const minutes = (n: number) => new Date(now - n * 60_000).toISOString();
const hoursAhead = (n: number) => new Date(now + n * 3_600_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const MOCK_SELLER_ORDERS: SellerOrder[] = [
  {
    id: 'ORD-4417',
    customerName: 'Ananya Sen',
    customerPhone: '+91 98300 45612',
    serviceName: 'Printing',
    specifications: 'A4 Colour, 120 pages, Premium paper, Spiral binding',
    fileUrl: '/mock/thesis-final.pdf',
    fileName: 'thesis-final.pdf',
    quantity: 120,
    total: 1840,
    status: 'new',
    placedAt: minutes(12),
    deadline: hoursAhead(6),
    isRush: true,
    specialInstructions:
      'Please print double-sided and use the second page as the cover. The colour plates on pages 40–52 must not be compressed — they are the most important part of the submission.',
  },
  {
    id: 'ORD-4416',
    customerName: 'Rahul Banerjee',
    customerPhone: '+91 98311 55210',
    serviceName: 'Vinyl Banners',
    specifications: '6 × 3 ft outdoor vinyl, eyelets on all corners',
    fileUrl: '/mock/diwali-banner.ai',
    fileName: 'diwali-banner.ai',
    quantity: 2,
    total: 1620,
    status: 'new',
    placedAt: minutes(38),
    deadline: hoursAhead(22),
    isRush: false,
    specialInstructions: 'Matte finish preferred.',
  },
  {
    id: 'ORD-4415',
    customerName: 'Priyanka Ghosh',
    customerPhone: '+91 98304 88991',
    serviceName: 'B&W Xerox',
    specifications: 'A4 B&W, 300 pages, Standard paper, Stapled sets of 30',
    fileUrl: '/mock/study-notes.pdf',
    fileName: 'study-notes.pdf',
    quantity: 300,
    total: 480,
    status: 'new',
    placedAt: minutes(74),
    deadline: hoursAhead(30),
    isRush: false,
    specialInstructions: '',
  },
  {
    id: 'ORD-4412',
    customerName: 'Vikram Agarwal',
    customerPhone: '+91 98745 33218',
    serviceName: 'Premium Business Cards',
    specifications: '350 GSM matte, spot UV on logo, double-sided',
    fileUrl: '/mock/visiting-card.cdr',
    fileName: 'visiting-card.cdr',
    quantity: 500,
    total: 2250,
    status: 'accepted',
    placedAt: minutes(180),
    deadline: hoursAhead(1.5),
    isRush: true,
    specialInstructions: 'Client wants the Pantone 288C blue matched exactly.',
  },
  {
    id: 'ORD-4410',
    customerName: 'Meghna Roy',
    customerPhone: '+91 98362 41007',
    serviceName: 'Custom Stickers',
    specifications: 'Die-cut vinyl, 3 inch circular, glossy',
    fileUrl: '/mock/cafe-stickers.png',
    fileName: 'cafe-stickers.png',
    quantity: 250,
    total: 980,
    status: 'processing',
    placedAt: minutes(300),
    deadline: hoursAhead(9),
    isRush: false,
    specialInstructions: 'Cut line is on a separate layer named CutContour.',
  },
  {
    id: 'ORD-4408',
    customerName: 'Sourav Das',
    customerPhone: '+91 98315 90042',
    serviceName: 'Spiral Binding',
    specifications: 'A4, 220 pages, transparent front cover, black back',
    fileUrl: '/mock/project-report.pdf',
    fileName: 'project-report.pdf',
    quantity: 4,
    total: 640,
    status: 'processing',
    placedAt: minutes(420),
    deadline: hoursAhead(4),
    isRush: false,
    specialInstructions: '',
  },
  {
    id: 'ORD-4405',
    customerName: 'Ishita Chatterjee',
    customerPhone: '+91 98301 27788',
    serviceName: 'Fine Art Prints',
    specifications: 'A2 giclée on cotton rag, archival inks',
    fileUrl: '/mock/exhibition-set.tiff',
    fileName: 'exhibition-set.tiff',
    quantity: 8,
    total: 4200,
    status: 'ready_for_pickup',
    placedAt: daysAgo(1),
    deadline: hoursAhead(3),
    isRush: false,
    specialInstructions:
      'Pack each print separately with tissue interleaving. Customer will collect in person and inspect before accepting.',
  },
  {
    id: 'ORD-4402',
    customerName: 'Nikhil Saha',
    customerPhone: '+91 98040 66123',
    serviceName: 'Letterheads',
    specifications: 'A4, 100 GSM bond, single colour',
    fileUrl: '/mock/letterhead.pdf',
    fileName: 'letterhead.pdf',
    quantity: 1000,
    total: 3100,
    status: 'dispatched',
    placedAt: daysAgo(2),
    deadline: hoursAhead(20),
    isRush: false,
    specialInstructions: 'Deliver to the reception desk, ask for Mr. Saha.',
  },
  {
    id: 'ORD-4399',
    customerName: 'Debolina Bose',
    customerPhone: '+91 98366 10455',
    serviceName: 'Wedding Invitations',
    specifications: 'Letterpress, gold foil, 5 × 7 in, envelopes included',
    fileUrl: '/mock/wedding-suite.pdf',
    fileName: 'wedding-suite.pdf',
    quantity: 150,
    total: 8750,
    status: 'dispatched',
    placedAt: daysAgo(3),
    deadline: hoursAhead(30),
    isRush: false,
    specialInstructions: '',
  },
  {
    id: 'ORD-4390',
    customerName: 'Arjun Mitra',
    customerPhone: '+91 98300 12345',
    serviceName: 'Photo Prints',
    specifications: '6 × 4 in lustre finish',
    fileUrl: '/mock/family-album.zip',
    fileName: 'family-album.zip',
    quantity: 60,
    total: 1500,
    status: 'delivered',
    placedAt: daysAgo(6),
    deadline: daysAgo(4),
    isRush: false,
    specialInstructions: '',
  },
  {
    id: 'ORD-4386',
    customerName: 'Tanisha Paul',
    customerPhone: '+91 98311 22440',
    serviceName: 'Flyers & Pamphlets',
    specifications: 'A5, 130 GSM art paper, double-sided colour',
    fileUrl: '/mock/event-flyer.pdf',
    fileName: 'event-flyer.pdf',
    quantity: 2000,
    total: 5400,
    status: 'cancelled',
    placedAt: daysAgo(8),
    deadline: daysAgo(6),
    isRush: false,
    specialInstructions: 'Customer cancelled — event was postponed.',
  },
  {
    id: 'ORD-4381',
    customerName: 'Sujoy Mondal',
    customerPhone: '+91 98301 44521',
    serviceName: 'Lamination',
    specifications: 'A3 glossy lamination, 125 micron',
    fileUrl: '/mock/certificates.pdf',
    fileName: 'certificates.pdf',
    quantity: 40,
    total: 720,
    status: 'returned',
    placedAt: daysAgo(11),
    deadline: daysAgo(9),
    isRush: false,
    specialInstructions: 'Returned — customer reported bubbling on 6 sheets. Reprint approved.',
  },
];
