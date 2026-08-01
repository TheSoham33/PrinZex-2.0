/** Seller (print shop) records for the admin Sellers pages. */

export type SellerAccountStatus = 'pending' | 'approved' | 'suspended';
export type DocumentStatus = 'verified' | 'needs_review' | 'rejected';

export interface SellerDocument {
  type: 'gst_certificate' | 'business_license' | 'owner_id' | 'address_proof';
  label: string;
  fileName: string;
  status: DocumentStatus;
}

export interface SellerOrderRow {
  id: string;
  customer: string;
  service: string;
  total: number;
  status: string;
  placedAt: string;
}

export interface SellerReviewRow {
  id: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SellerPayoutRow {
  id: string;
  amount: number;
  status: string;
  date: string;
}

export interface AdminSeller {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  servicesCount: number;
  services: string[];
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  status: SellerAccountStatus;
  joinedAt: string;
  commissionRate: number;
  completionRate: number;
  onTimeDeliveryPct: number;
  totalPaidOut: number;
  pendingBalance: number;
  documents: SellerDocument[];
  orders: SellerOrderRow[];
  reviews: SellerReviewRow[];
  payouts: SellerPayoutRow[];
}

export const REJECTION_REASONS = [
  'Documents unclear or illegible',
  'GST number could not be verified',
  'Business address does not match records',
  'Duplicate application already on file',
];

const docs = (overrides?: Partial<Record<SellerDocument['type'], DocumentStatus>>): SellerDocument[] => [
  { type: 'gst_certificate', label: 'GST Certificate', fileName: 'gst-certificate.pdf', status: overrides?.gst_certificate ?? 'verified' },
  { type: 'business_license', label: 'Business License', fileName: 'trade-license.pdf', status: overrides?.business_license ?? 'verified' },
  { type: 'owner_id', label: 'Owner ID Proof', fileName: 'aadhaar-front.jpg', status: overrides?.owner_id ?? 'verified' },
  { type: 'address_proof', label: 'Address Proof', fileName: 'electricity-bill.pdf', status: overrides?.address_proof ?? 'verified' },
];

export const MOCK_ADMIN_SELLERS: AdminSeller[] = [
  {
    id: 'SLR-201',
    storeName: 'Print Master Pro',
    ownerName: 'Rajesh Kumar',
    email: 'hello@printmasterpro.in',
    phone: '+91 98300 12345',
    city: 'Kolkata',
    address: '23A, BD Block, Sector 1, Salt Lake City, Kolkata 700064',
    servicesCount: 5,
    services: ['Colour Printing', 'B&W Xerox', 'Vinyl Banners', 'Lamination', 'Spiral Binding'],
    totalOrders: 1284,
    totalRevenue: 964200,
    rating: 4.8,
    status: 'approved',
    joinedAt: '2024-03-14',
    commissionRate: 12,
    completionRate: 94.2,
    onTimeDeliveryPct: 91.6,
    totalPaidOut: 828400,
    pendingBalance: 18640,
    documents: docs(),
    orders: [
      { id: 'ORD-4417', customer: 'Ananya Sen', service: 'Colour Printing', total: 1840, status: 'new', placedAt: '2026-07-27T10:48:00+05:30' },
      { id: 'ORD-1122', customer: 'Ananya Sen', service: 'Vinyl Banners', total: 300, status: 'delivered', placedAt: '2026-07-18T12:40:00+05:30' },
      { id: 'ORD-4402', customer: 'Nikhil Saha', service: 'Letterheads', total: 3100, status: 'dispatched', placedAt: '2026-07-25T09:00:00+05:30' },
    ],
    reviews: [
      { id: 'r1', customer: 'Ananya Sen', rating: 5, comment: 'Binding was neat and delivered a day early.', date: '2026-07-24' },
      { id: 'r2', customer: 'Priyanka Ghosh', rating: 4, comment: 'Good quality at a fair price.', date: '2026-07-18' },
    ],
    payouts: [
      { id: 'PO-20260720', amount: 22180, status: 'processing', date: '2026-07-27' },
      { id: 'PO-20260713', amount: 19750, status: 'paid', date: '2026-07-20' },
    ],
  },
  {
    id: 'SLR-202',
    storeName: 'Quick Copy Hub',
    ownerName: 'Sneha Dutta',
    email: 'quickcopyhub@gmail.com',
    phone: '+91 98311 55210',
    city: 'Kolkata',
    address: '7/1, Kestopur Main Road, Kolkata 700102',
    servicesCount: 4,
    services: ['B&W Printing', 'Colour Printing', 'Custom Stickers', 'Document Scanning'],
    totalOrders: 892,
    totalRevenue: 341800,
    rating: 4.2,
    status: 'approved',
    joinedAt: '2024-07-22',
    commissionRate: 12,
    completionRate: 89.4,
    onTimeDeliveryPct: 84.1,
    totalPaidOut: 296300,
    pendingBalance: 9420,
    documents: docs(),
    orders: [
      { id: 'ORD-4415', customer: 'Priyanka Ghosh', service: 'B&W Xerox', total: 480, status: 'new', placedAt: '2026-07-27T09:46:00+05:30' },
      { id: 'ORD-4410', customer: 'Meghna Roy', service: 'Custom Stickers', total: 980, status: 'processing', placedAt: '2026-07-27T05:00:00+05:30' },
    ],
    reviews: [
      { id: 'r3', customer: 'Meghna Roy', rating: 4, comment: 'Cheapest xerox around.', date: '2026-07-18' },
      { id: 'r4', customer: 'Tanisha Paul', rating: 3, comment: 'Delivery took longer than estimated.', date: '2026-06-20' },
    ],
    payouts: [{ id: 'PO-20260706', amount: 16420, status: 'paid', date: '2026-07-13' }],
  },
  {
    id: 'SLR-203',
    storeName: 'Elite Press Studio',
    ownerName: 'Vikram Agarwal',
    email: 'studio@elitepress.co.in',
    phone: '+91 98304 88991',
    city: 'Kolkata',
    address: '14 Park Street, Near Park Mansions, Kolkata 700016',
    servicesCount: 5,
    services: ['Premium Business Cards', 'Fine Art Prints', 'Wedding Invitations', 'Large Format Banners', 'Photo Prints'],
    totalOrders: 2140,
    totalRevenue: 1842000,
    rating: 4.9,
    status: 'approved',
    joinedAt: '2023-11-05',
    commissionRate: 10,
    completionRate: 97.8,
    onTimeDeliveryPct: 95.2,
    totalPaidOut: 1620400,
    pendingBalance: 42310,
    documents: docs(),
    orders: [
      { id: 'ORD-4412', customer: 'Vikram Agarwal', service: 'Business Cards', total: 2250, status: 'accepted', placedAt: '2026-07-27T07:58:00+05:30' },
      { id: 'ORD-4405', customer: 'Ishita Chatterjee', service: 'Fine Art Prints', total: 4200, status: 'ready_for_pickup', placedAt: '2026-07-26T11:00:00+05:30' },
    ],
    reviews: [
      { id: 'r5', customer: 'Vikram Agarwal', rating: 5, comment: 'Studio quality business cards.', date: '2026-07-21' },
      { id: 'r6', customer: 'Ishita Chatterjee', rating: 5, comment: 'Colour calibration spot on.', date: '2026-07-09' },
    ],
    payouts: [{ id: 'PO-20260629', amount: 24310, status: 'paid', date: '2026-07-06' }],
  },
  {
    id: 'SLR-204',
    storeName: 'Colorcraft Studio',
    ownerName: 'Imran Sheikh',
    email: 'contact@colorcraft.in',
    phone: '+91 98362 55118',
    city: 'Howrah',
    address: '31 GT Road, Salkia, Howrah 711106',
    servicesCount: 3,
    services: ['Colour Printing', 'Photo Prints', 'Canvas Prints'],
    totalOrders: 0,
    totalRevenue: 0,
    rating: 0,
    status: 'pending',
    joinedAt: '2026-07-25',
    commissionRate: 12,
    completionRate: 0,
    onTimeDeliveryPct: 0,
    totalPaidOut: 0,
    pendingBalance: 0,
    documents: docs({ gst_certificate: 'needs_review', address_proof: 'needs_review' }),
    orders: [],
    reviews: [],
    payouts: [],
  },
  {
    id: 'SLR-205',
    storeName: 'Sharma Prints',
    ownerName: 'Deepak Sharma',
    email: 'sharmaprints@gmail.com',
    phone: '+91 98745 33218',
    city: 'Kolkata',
    address: '52 Gariahat Road, Ballygunge, Kolkata 700019',
    servicesCount: 4,
    services: ['Flex Banners', 'Vinyl Printing', 'Standees', 'Stickers'],
    totalOrders: 431,
    totalRevenue: 289400,
    rating: 4.5,
    status: 'approved',
    joinedAt: '2025-02-11',
    commissionRate: 12,
    completionRate: 91.0,
    onTimeDeliveryPct: 88.3,
    totalPaidOut: 241200,
    pendingBalance: 4200,
    documents: docs(),
    orders: [],
    reviews: [{ id: 'r7', customer: 'Rahul Banerjee', rating: 5, comment: 'Same day banners, superb.', date: '2026-07-02' }],
    payouts: [{ id: 'PO-20260622', amount: 14980, status: 'paid', date: '2026-06-29' }],
  },
  {
    id: 'SLR-206',
    storeName: 'Campus Print Point',
    ownerName: 'Sourav Das',
    email: 'campusprintpoint@gmail.com',
    phone: '+91 98315 90042',
    city: 'Kolkata',
    address: '188 Raja S C Mallick Road, Jadavpur, Kolkata 700032',
    servicesCount: 4,
    services: ['B&W Printing', 'Colour Printing', 'Spiral Binding', 'Lamination'],
    totalOrders: 618,
    totalRevenue: 154300,
    rating: 4.4,
    status: 'suspended',
    joinedAt: '2025-06-30',
    commissionRate: 14,
    completionRate: 76.2,
    onTimeDeliveryPct: 68.9,
    totalPaidOut: 128100,
    pendingBalance: 0,
    documents: docs({ business_license: 'rejected' }),
    orders: [],
    reviews: [{ id: 'r8', customer: 'Tanisha Paul', rating: 2, comment: 'Repeated delays on submissions.', date: '2026-06-15' }],
    payouts: [],
  },
  {
    id: 'SLR-207',
    storeName: 'Banner Bazaar',
    ownerName: 'Farhan Ali',
    email: 'contact@bannerbazaar.in',
    phone: '+91 98366 10455',
    city: 'Kolkata',
    address: '77 Diamond Harbour Road, Behala, Kolkata 700034',
    servicesCount: 3,
    services: ['Flex Banners', 'Backlit Boards', 'Vehicle Wraps'],
    totalOrders: 1120,
    totalRevenue: 742900,
    rating: 4.5,
    status: 'approved',
    joinedAt: '2024-09-17',
    commissionRate: 11,
    completionRate: 92.6,
    onTimeDeliveryPct: 90.1,
    totalPaidOut: 651300,
    pendingBalance: 12800,
    documents: docs(),
    orders: [
      { id: 'ORD-4416', customer: 'Rahul Banerjee', service: 'Vinyl Banners', total: 1620, status: 'new', placedAt: '2026-07-27T10:22:00+05:30' },
    ],
    reviews: [],
    payouts: [],
  },
  {
    id: 'SLR-208',
    storeName: 'Signature Stationers',
    ownerName: 'Meera Iyer',
    email: 'sales@signaturestationers.in',
    phone: '+91 98301 27788',
    city: 'Kolkata',
    address: '9 Camac Street, Kolkata 700017',
    servicesCount: 3,
    services: ['Visiting Cards', 'Letterheads', 'Bill Books'],
    totalOrders: 967,
    totalRevenue: 528600,
    rating: 4.7,
    status: 'approved',
    joinedAt: '2024-05-08',
    commissionRate: 12,
    completionRate: 95.4,
    onTimeDeliveryPct: 93.7,
    totalPaidOut: 468200,
    pendingBalance: 8900,
    documents: docs(),
    orders: [],
    reviews: [],
    payouts: [],
  },
  {
    id: 'SLR-209',
    storeName: 'Rapid Xerox Corner',
    ownerName: 'Bikash Pal',
    email: 'rapidxerox@gmail.com',
    phone: '+91 98040 66123',
    city: 'Kolkata',
    address: 'Shop 4, City Centre Crossing, Salt Lake, Kolkata 700064',
    servicesCount: 3,
    services: ['B&W Printing', 'Lamination', 'Document Scanning'],
    totalOrders: 0,
    totalRevenue: 0,
    rating: 0,
    status: 'pending',
    joinedAt: '2026-07-26',
    commissionRate: 12,
    completionRate: 0,
    onTimeDeliveryPct: 0,
    totalPaidOut: 0,
    pendingBalance: 0,
    documents: docs({ owner_id: 'needs_review' }),
    orders: [],
    reviews: [],
    payouts: [],
  },
  {
    id: 'SLR-210',
    storeName: 'Howrah Print House',
    ownerName: 'Ajay Ghosh',
    email: 'howrahprinthouse@rediffmail.com',
    phone: '+91 98311 22440',
    city: 'Howrah',
    address: '31 GT Road, Salkia, Howrah 711106',
    servicesCount: 3,
    services: ['B&W Printing', 'Brochures', 'Bill Books'],
    totalOrders: 0,
    totalRevenue: 0,
    rating: 0,
    status: 'pending',
    joinedAt: '2026-07-27',
    commissionRate: 12,
    completionRate: 0,
    onTimeDeliveryPct: 0,
    totalPaidOut: 0,
    pendingBalance: 0,
    documents: docs({ gst_certificate: 'needs_review', business_license: 'needs_review', owner_id: 'needs_review', address_proof: 'needs_review' }),
    orders: [],
    reviews: [],
    payouts: [],
  },
];
