/** Seller onboarding types + the service catalogue used in step 2. */

export type BusinessType = 'sole_proprietor' | 'partnership' | 'pvt_ltd' | 'llp' | '';

export interface StoreInfo {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstNumber: string;
  businessType: BusinessType;
  storeAddress: string;
  city: string;
  state: string;
  pincode: string;
  openingTime: string;
  closingTime: string;
  storeLogo: string | null;
  storeBanner: string | null;
}

export interface SelectedService {
  categoryId: string;
  serviceId: string;
  serviceName: string;
}

export type PricingUnit =
  | 'per page'
  | 'per piece'
  | 'per sq ft'
  | 'per kg'
  | 'starting from';

export const PRICING_UNITS: PricingUnit[] = [
  'per page',
  'per piece',
  'per sq ft',
  'per kg',
  'starting from',
];

export interface PricingEntry {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  unit: PricingUnit;
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  panNumber: string;
}

export type DocumentType =
  | 'gst_certificate'
  | 'business_license'
  | 'owner_id'
  | 'address_proof';

export interface UploadedDoc {
  type: DocumentType;
  label: string;
  /** File name once selected; null while empty. */
  file: string | null;
}

export interface SellerRegistrationState {
  storeInfo: StoreInfo;
  selectedServices: SelectedService[];
  pricing: PricingEntry[];
  bankDetails: BankDetails;
  documents: UploadedDoc[];
  currentStep: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  services: { id: string; name: string }[];
}

export const BUSINESS_TYPES: { value: Exclude<BusinessType, ''>; label: string }[] = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'pvt_ltd', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
];

export const REQUIRED_DOCUMENTS: UploadedDoc[] = [
  { type: 'gst_certificate', label: 'GST Certificate', file: null },
  { type: 'business_license', label: 'Business License', file: null },
  { type: 'owner_id', label: 'Owner ID Proof', file: null },
  { type: 'address_proof', label: 'Address Proof', file: null },
];

/** 8 categories / 34 services offered during seller onboarding. */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'documents',
    name: 'Documents',
    description: 'Everyday printing, photocopying and scanning',
    services: [
      { id: 'doc-bw-print', name: 'B&W Printing' },
      { id: 'doc-color-print', name: 'Colour Printing' },
      { id: 'doc-xerox', name: 'Photocopy / Xerox' },
      { id: 'doc-scan', name: 'Document Scanning' },
      { id: 'doc-fax', name: 'Fax & Email Service' },
    ],
  },
  {
    id: 'bulk',
    name: 'Bulk printing',
    description: 'High-volume jobs at wholesale rates',
    services: [
      { id: 'bulk-booklets', name: 'Booklets & Manuals' },
      { id: 'bulk-brochures', name: 'Brochures' },
      { id: 'bulk-flyers', name: 'Flyers & Pamphlets' },
      { id: 'bulk-question-papers', name: 'Question Papers' },
    ],
  },
  {
    id: 'stationery',
    name: 'Business stationery',
    description: 'Branded material for offices and shops',
    services: [
      { id: 'stat-visiting-cards', name: 'Visiting Cards' },
      { id: 'stat-letterheads', name: 'Letterheads' },
      { id: 'stat-envelopes', name: 'Envelopes' },
      { id: 'stat-bill-books', name: 'Bill Books & Invoices' },
      { id: 'stat-id-cards', name: 'ID Cards' },
    ],
  },
  {
    id: 'specialty',
    name: 'Specialty printing',
    description: 'Premium finishes and personalised gifts',
    services: [
      { id: 'spec-photo-prints', name: 'Photo Prints' },
      { id: 'spec-canvas', name: 'Canvas Prints' },
      { id: 'spec-mugs', name: 'Mug Printing' },
      { id: 'spec-tshirts', name: 'T-shirt Printing' },
      { id: 'spec-invitations', name: 'Wedding Invitations' },
    ],
  },
  {
    id: 'packaging',
    name: 'Packaging & labels',
    description: 'Product labels, stickers and boxes',
    services: [
      { id: 'pack-stickers', name: 'Custom Stickers' },
      { id: 'pack-labels', name: 'Product Labels' },
      { id: 'pack-boxes', name: 'Printed Boxes' },
      { id: 'pack-tags', name: 'Hang Tags' },
    ],
  },
  {
    id: 'binding',
    name: 'Book binding & finishing',
    description: 'Post-print finishing services',
    services: [
      { id: 'bind-spiral', name: 'Spiral Binding' },
      { id: 'bind-hard', name: 'Hard Binding' },
      { id: 'bind-perfect', name: 'Perfect Binding' },
      { id: 'bind-lamination', name: 'Lamination' },
      { id: 'bind-cutting', name: 'Paper Cutting & Trimming' },
    ],
  },
  {
    id: 'large-format',
    name: 'Large format printing',
    description: 'Banners, standees and signage',
    services: [
      { id: 'lf-flex-banner', name: 'Flex Banners' },
      { id: 'lf-vinyl', name: 'Vinyl Printing' },
      { id: 'lf-standee', name: 'Standees & Roll-ups' },
      { id: 'lf-hoarding', name: 'Hoardings' },
      { id: 'lf-vehicle-wrap', name: 'Vehicle Wraps' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom services',
    description: 'Design help and doorstep convenience',
    services: [
      { id: 'cust-design', name: 'Graphic Design Support' },
      { id: 'cust-urgent', name: 'Urgent / Same-day Jobs' },
      { id: 'cust-pickup', name: 'Doorstep Pickup & Drop' },
    ],
  },
];

export const INITIAL_STORE_INFO: StoreInfo = {
  storeName: '',
  ownerName: '',
  email: '',
  phone: '',
  gstNumber: '',
  businessType: '',
  storeAddress: '',
  city: '',
  state: '',
  pincode: '',
  openingTime: '09:00',
  closingTime: '21:00',
  storeLogo: null,
  storeBanner: null,
};

export const INITIAL_BANK_DETAILS: BankDetails = {
  accountHolderName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  panNumber: '',
};

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SELLER_DRAFT_KEY = 'prinzex_seller_draft';
