/** Platform-wide order records, disputes and support tickets for the admin panel. */

export type AdminOrderStatus =
  | 'placed'
  | 'accepted'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface AdminOrderTimelineEvent {
  label: string;
  actor: 'customer' | 'seller' | 'delivery' | 'system';
  timestamp: string | null;
}

export interface OrderDispute {
  id: string;
  raisedBy: 'customer' | 'seller';
  reason: string;
  detail: string;
  raisedAt: string;
  resolution: 'unresolved' | 'customer' | 'seller';
}

export interface AdminOrder {
  id: string;
  customerName: string;
  customerId: string;
  storeName: string;
  storeId: string;
  serviceName: string;
  specifications: string;
  fileName: string;
  quantity: number;
  total: number;
  status: AdminOrderStatus;
  placedAt: string;
  isRush: boolean;
  address: string;
  deliverySpeed: string;
  deliveryBoyId: string | null;
  deliveryBoyName: string | null;
  refunded: boolean;
  refundAmount: number;
  dispute: OrderDispute | null;
  timeline: AdminOrderTimelineEvent[];
}

const tl = (
  placed: string,
  accepted?: string,
  processing?: string,
  dispatched?: string,
  delivered?: string,
): AdminOrderTimelineEvent[] => [
  { label: 'Order placed by customer', actor: 'customer', timestamp: placed },
  { label: 'Accepted by seller', actor: 'seller', timestamp: accepted ?? null },
  { label: 'Printing in progress', actor: 'seller', timestamp: processing ?? null },
  { label: 'Dispatched for delivery', actor: 'delivery', timestamp: dispatched ?? null },
  { label: 'Delivered to customer', actor: 'delivery', timestamp: delivered ?? null },
];

export const MOCK_ADMIN_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-4417', customerName: 'Ananya Sen', customerId: 'USR-1001',
    storeName: 'Print Master Pro', storeId: 'SLR-201', serviceName: 'Printing',
    specifications: 'A4 Colour, 120 pages, Premium paper, Spiral binding',
    fileName: 'thesis-final.pdf', quantity: 120, total: 1840, status: 'placed',
    placedAt: '2026-07-27T10:48:00+05:30', isRush: true,
    address: 'Flat 4B, Green Apartments, Salt Lake, Kolkata 700091',
    deliverySpeed: 'Same-day', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-27T10:48:00+05:30'),
  },
  {
    id: 'ORD-4416', customerName: 'Rahul Banerjee', customerId: 'USR-1002',
    storeName: 'Banner Bazaar', storeId: 'SLR-207', serviceName: 'Vinyl Banners',
    specifications: '6 × 3 ft outdoor vinyl, eyelets on all corners',
    fileName: 'diwali-banner.ai', quantity: 2, total: 1620, status: 'placed',
    placedAt: '2026-07-27T10:22:00+05:30', isRush: false,
    address: '12/3 Kestopur Main Road, Kolkata 700102',
    deliverySpeed: 'Standard', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-27T10:22:00+05:30'),
  },
  {
    id: 'ORD-4412', customerName: 'Vikram Agarwal', customerId: 'USR-1004',
    storeName: 'Elite Press Studio', storeId: 'SLR-203', serviceName: 'Premium Business Cards',
    specifications: '350 GSM matte, spot UV on logo, double-sided',
    fileName: 'visiting-card.cdr', quantity: 500, total: 2250, status: 'accepted',
    placedAt: '2026-07-27T07:58:00+05:30', isRush: true,
    address: '9 Camac Street, Kolkata 700017',
    deliverySpeed: 'Express', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-27T07:58:00+05:30', '2026-07-27T08:20:00+05:30'),
  },
  {
    id: 'ORD-4410', customerName: 'Meghna Roy', customerId: 'USR-1005',
    storeName: 'Quick Copy Hub', storeId: 'SLR-202', serviceName: 'Custom Stickers',
    specifications: 'Die-cut vinyl, 3 inch circular, glossy',
    fileName: 'cafe-stickers.png', quantity: 250, total: 980, status: 'processing',
    placedAt: '2026-07-27T05:00:00+05:30', isRush: false,
    address: '77 Diamond Harbour Road, Behala, Kolkata 700034',
    deliverySpeed: 'Standard', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-27T05:00:00+05:30', '2026-07-27T05:30:00+05:30', '2026-07-27T07:00:00+05:30'),
  },
  {
    id: 'ORD-4405', customerName: 'Ishita Chatterjee', customerId: 'USR-1007',
    storeName: 'Elite Press Studio', storeId: 'SLR-203', serviceName: 'Fine Art Prints',
    specifications: 'A2 giclée on cotton rag, archival inks',
    fileName: 'exhibition-set.tiff', quantity: 8, total: 4200, status: 'processing',
    placedAt: '2026-07-26T11:00:00+05:30', isRush: false,
    address: '14 Park Street, Kolkata 700016',
    deliverySpeed: 'Store pickup', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0,
    dispute: {
      id: 'DSP-11', raisedBy: 'customer', reason: 'Quality not as expected',
      detail: 'Customer reports a colour shift on three of the eight prints compared to the proof they approved.',
      raisedAt: '2026-07-27T09:10:00+05:30', resolution: 'unresolved',
    },
    timeline: tl('2026-07-26T11:00:00+05:30', '2026-07-26T11:30:00+05:30', '2026-07-26T15:00:00+05:30'),
  },
  {
    id: 'ORD-4402', customerName: 'Nikhil Saha', customerId: 'USR-1008',
    storeName: 'Print Master Pro', storeId: 'SLR-201', serviceName: 'Letterheads',
    specifications: 'A4, 100 GSM bond, single colour',
    fileName: 'letterhead.pdf', quantity: 1000, total: 3100, status: 'dispatched',
    placedAt: '2026-07-25T09:00:00+05:30', isRush: false,
    address: 'Shop 4, City Centre, Salt Lake, Kolkata 700064',
    deliverySpeed: 'Standard', deliveryBoyId: 'DLV-301', deliveryBoyName: 'Sujoy Mondal',
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-25T09:00:00+05:30', '2026-07-25T09:40:00+05:30', '2026-07-25T14:00:00+05:30', '2026-07-26T10:00:00+05:30'),
  },
  {
    id: 'ORD-4399', customerName: 'Debolina Bose', customerId: 'USR-1009',
    storeName: 'Elite Press Studio', storeId: 'SLR-203', serviceName: 'Wedding Invitations',
    specifications: 'Letterpress, gold foil, 5 × 7 in, envelopes included',
    fileName: 'wedding-suite.pdf', quantity: 150, total: 8750, status: 'dispatched',
    placedAt: '2026-07-24T10:00:00+05:30', isRush: false,
    address: '52 Gariahat Road, Ballygunge, Kolkata 700019',
    deliverySpeed: 'Express', deliveryBoyId: 'DLV-302', deliveryBoyName: 'Rakesh Yadav',
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-24T10:00:00+05:30', '2026-07-24T10:35:00+05:30', '2026-07-25T09:00:00+05:30', '2026-07-26T09:00:00+05:30'),
  },
  {
    id: 'ORD-4390', customerName: 'Arjun Mitra', customerId: 'USR-1010',
    storeName: 'ColorWorks Digital', storeId: 'SLR-205', serviceName: 'Photo Prints',
    specifications: '6 × 4 in lustre finish', fileName: 'family-album.zip',
    quantity: 60, total: 1500, status: 'delivered',
    placedAt: '2026-07-21T14:00:00+05:30', isRush: false,
    address: '188 Raja S C Mallick Road, Jadavpur, Kolkata 700032',
    deliverySpeed: 'Standard', deliveryBoyId: 'DLV-302', deliveryBoyName: 'Rakesh Yadav',
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-21T14:00:00+05:30', '2026-07-21T14:30:00+05:30', '2026-07-22T09:00:00+05:30', '2026-07-23T09:00:00+05:30', '2026-07-23T13:20:00+05:30'),
  },
  {
    id: 'ORD-4386', customerName: 'Tanisha Paul', customerId: 'USR-1011',
    storeName: 'Quick Copy Hub', storeId: 'SLR-202', serviceName: 'Flyers & Pamphlets',
    specifications: 'A5, 130 GSM art paper, double-sided colour',
    fileName: 'event-flyer.pdf', quantity: 2000, total: 5400, status: 'cancelled',
    placedAt: '2026-07-19T16:00:00+05:30', isRush: false,
    address: '7/1 Kestopur, Kolkata 700102',
    deliverySpeed: 'Standard', deliveryBoyId: null, deliveryBoyName: null,
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-19T16:00:00+05:30'),
  },
  {
    id: 'ORD-4381', customerName: 'Sourav Das', customerId: 'USR-1006',
    storeName: 'Campus Print Point', storeId: 'SLR-206', serviceName: 'Lamination',
    specifications: 'A3 glossy lamination, 125 micron',
    fileName: 'certificates.pdf', quantity: 40, total: 720, status: 'refunded',
    placedAt: '2026-07-16T11:00:00+05:30', isRush: false,
    address: '31 GT Road, Salkia, Howrah 711106',
    deliverySpeed: 'Standard', deliveryBoyId: 'DLV-303', deliveryBoyName: 'Amit Halder',
    refunded: true, refundAmount: 720,
    dispute: {
      id: 'DSP-09', raisedBy: 'customer', reason: 'Damaged on arrival',
      detail: 'Six laminated sheets arrived with bubbling. Seller agreed to a full refund.',
      raisedAt: '2026-07-17T10:00:00+05:30', resolution: 'customer',
    },
    timeline: tl('2026-07-16T11:00:00+05:30', '2026-07-16T11:20:00+05:30', '2026-07-16T15:00:00+05:30', '2026-07-17T09:00:00+05:30', '2026-07-17T12:00:00+05:30'),
  },
  {
    id: 'ORD-4375', customerName: 'Imran Sheikh', customerId: 'USR-1012',
    storeName: 'Signature Stationers', storeId: 'SLR-208', serviceName: 'Visiting Cards',
    specifications: '300 GSM matte, single-sided', fileName: 'cards.pdf',
    quantity: 200, total: 640, status: 'delivered',
    placedAt: '2026-07-14T09:30:00+05:30', isRush: false,
    address: '23A BD Block, Salt Lake, Kolkata 700064',
    deliverySpeed: 'Standard', deliveryBoyId: 'DLV-301', deliveryBoyName: 'Sujoy Mondal',
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-14T09:30:00+05:30', '2026-07-14T10:00:00+05:30', '2026-07-14T14:00:00+05:30', '2026-07-15T10:00:00+05:30', '2026-07-15T15:40:00+05:30'),
  },
  {
    id: 'ORD-4362', customerName: 'Ananya Sen', customerId: 'USR-1001',
    storeName: 'Sharma Prints', storeId: 'SLR-205', serviceName: 'Flex Banners',
    specifications: '8 × 4 ft flex, matte finish', fileName: 'shop-banner.pdf',
    quantity: 1, total: 1280, status: 'delivered',
    placedAt: '2026-07-10T13:00:00+05:30', isRush: true,
    address: 'Flat 4B, Green Apartments, Salt Lake, Kolkata 700091',
    deliverySpeed: 'Same-day', deliveryBoyId: 'DLV-305', deliveryBoyName: 'Sanjay Bera',
    refunded: false, refundAmount: 0, dispute: null,
    timeline: tl('2026-07-10T13:00:00+05:30', '2026-07-10T13:15:00+05:30', '2026-07-10T15:00:00+05:30', '2026-07-10T17:00:00+05:30', '2026-07-10T19:30:00+05:30'),
  },
];

/* ------------------------------------------------------------------ */
/* Support tickets                                                     */
/* ------------------------------------------------------------------ */

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'delivery_issue' | 'quality' | 'payment' | 'other';

export interface TicketMessage {
  id: string;
  from: 'customer' | 'agent';
  author: string;
  body: string;
  at: string;
}

export interface SupportTicket {
  id: string;
  customerName: string;
  customerId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  assignedTo: string;
  status: TicketStatus;
  createdAt: string;
  linkedOrderId: string | null;
  thread: TicketMessage[];
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  delivery_issue: 'Delivery issue',
  quality: 'Quality',
  payment: 'Payment',
  other: 'Other',
};

export const SUPPORT_AGENTS = ['Farah Khan', 'Rohan Iyer', 'Aditi Verma', 'Unassigned'];

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'T-441', customerName: 'Ishita Chatterjee', customerId: 'USR-1007',
    subject: 'Colour shift on fine art prints', category: 'quality', priority: 'high',
    assignedTo: 'Farah Khan', status: 'open', createdAt: '2026-07-27T09:12:00+05:30',
    linkedOrderId: 'ORD-4405',
    thread: [
      { id: 'm1', from: 'customer', author: 'Ishita Chatterjee', body: 'Three of the eight prints have a visible magenta cast that was not in the proof I approved. I need these for an exhibition on Friday.', at: '2026-07-27T09:12:00+05:30' },
      { id: 'm2', from: 'agent', author: 'Farah Khan', body: 'Thanks for flagging this — I have asked the studio to re-check their colour profile and share a fresh proof today.', at: '2026-07-27T09:40:00+05:30' },
    ],
  },
  {
    id: 'T-440', customerName: 'Rahul Banerjee', customerId: 'USR-1002',
    subject: 'Banner delivery not started', category: 'delivery_issue', priority: 'medium',
    assignedTo: 'Rohan Iyer', status: 'in_progress', createdAt: '2026-07-27T08:05:00+05:30',
    linkedOrderId: 'ORD-4416',
    thread: [
      { id: 'm3', from: 'customer', author: 'Rahul Banerjee', body: 'My order still shows as placed. The event is tomorrow morning.', at: '2026-07-27T08:05:00+05:30' },
    ],
  },
  {
    id: 'T-438', customerName: 'Sourav Das', customerId: 'USR-1006',
    subject: 'Refund not received', category: 'payment', priority: 'high',
    assignedTo: 'Farah Khan', status: 'in_progress', createdAt: '2026-07-26T15:20:00+05:30',
    linkedOrderId: 'ORD-4381',
    thread: [
      { id: 'm4', from: 'customer', author: 'Sourav Das', body: 'The refund was approved a week ago but nothing has hit my account.', at: '2026-07-26T15:20:00+05:30' },
      { id: 'm5', from: 'agent', author: 'Farah Khan', body: 'I can see the refund was issued on 17 July. Bank settlement can take 5–7 working days — I am escalating to finance.', at: '2026-07-26T16:00:00+05:30' },
    ],
  },
  {
    id: 'T-435', customerName: 'Meghna Roy', customerId: 'USR-1005',
    subject: 'Sticker cut line misaligned', category: 'quality', priority: 'medium',
    assignedTo: 'Unassigned', status: 'open', createdAt: '2026-07-26T11:45:00+05:30',
    linkedOrderId: 'ORD-4410',
    thread: [
      { id: 'm6', from: 'customer', author: 'Meghna Roy', body: 'The die-cut is about 2mm off on the samples I was shown.', at: '2026-07-26T11:45:00+05:30' },
    ],
  },
  {
    id: 'T-430', customerName: 'Debolina Bose', customerId: 'USR-1009',
    subject: 'Change delivery address', category: 'delivery_issue', priority: 'low',
    assignedTo: 'Aditi Verma', status: 'resolved', createdAt: '2026-07-25T10:00:00+05:30',
    linkedOrderId: 'ORD-4399',
    thread: [
      { id: 'm7', from: 'customer', author: 'Debolina Bose', body: 'Can I switch delivery to my office address?', at: '2026-07-25T10:00:00+05:30' },
      { id: 'm8', from: 'agent', author: 'Aditi Verma', body: 'Updated — the courier has the new address. Nothing further needed from you.', at: '2026-07-25T10:25:00+05:30' },
    ],
  },
  {
    id: 'T-428', customerName: 'Arjun Mitra', customerId: 'USR-1010',
    subject: 'Wallet credit missing', category: 'payment', priority: 'medium',
    assignedTo: 'Rohan Iyer', status: 'resolved', createdAt: '2026-07-24T14:30:00+05:30',
    linkedOrderId: null,
    thread: [
      { id: 'm9', from: 'customer', author: 'Arjun Mitra', body: 'My signup bonus never appeared.', at: '2026-07-24T14:30:00+05:30' },
      { id: 'm10', from: 'agent', author: 'Rohan Iyer', body: 'Credited ₹500 to your wallet manually. Apologies for the delay.', at: '2026-07-24T15:10:00+05:30' },
    ],
  },
  {
    id: 'T-421', customerName: 'Tanisha Paul', customerId: 'USR-1011',
    subject: 'Order cancelled without notice', category: 'other', priority: 'low',
    assignedTo: 'Farah Khan', status: 'closed', createdAt: '2026-07-20T09:00:00+05:30',
    linkedOrderId: 'ORD-4386',
    thread: [
      { id: 'm11', from: 'customer', author: 'Tanisha Paul', body: 'My flyer order was cancelled. Why?', at: '2026-07-20T09:00:00+05:30' },
      { id: 'm12', from: 'agent', author: 'Farah Khan', body: 'The event was postponed and you requested the cancellation on 19 July. No charge was made.', at: '2026-07-20T09:30:00+05:30' },
    ],
  },
  {
    id: 'T-418', customerName: 'Vikram Agarwal', customerId: 'USR-1004',
    subject: 'Bulk pricing enquiry', category: 'other', priority: 'low',
    assignedTo: 'Unassigned', status: 'open', createdAt: '2026-07-19T12:00:00+05:30',
    linkedOrderId: null,
    thread: [
      { id: 'm13', from: 'customer', author: 'Vikram Agarwal', body: 'Do you offer corporate rates for 5000+ cards per month?', at: '2026-07-19T12:00:00+05:30' },
    ],
  },
];
