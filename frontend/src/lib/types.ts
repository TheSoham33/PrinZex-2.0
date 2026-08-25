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
  isOpen: boolean;
  /** Store coordinates (from the DB) — used to compute distance client-side. */
  lat?: number | null;
  lng?: number | null;
  matchedService?: {
    id: string;
    serviceName: string;
    basePrice: number;
    unit: string;
  } | null;
  /** The store's B&W per-page rate (₹/page), shown on the store card. */
  pagePrice?: number | null;
}

export interface StoreHours {
  day: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface ServiceOffering {
  id: string;
  name: string;
  icon: string;
  startingPrice: number;
  unit: string;
  description: string;
  /** Seller-enforced minimum order quantity (defaults to 1 when absent). */
  minQuantity?: number;
  /** Seller-enforced minimum PDF page count for this service (unset = no minimum). */
  minPages?: number;
  /** Seller-enabled options; values are additive prices for this service. */
  paperTypePrices?: Record<string, number>;
  paperSizePrices?: Record<string, number>;
  /** Document Printing modes enabled by the seller. */
  availableColorModes?: Array<'bw' | 'color'>;
  twinLoopOptions?: {
    wireColors?: Record<string, number>;
    frontCovers?: Record<string, number>;
    backCovers?: Record<string, number>;
    hangerPrice?: number;
    concealedPrice?: number;
  };
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
  /** Daily open/close window (used when no per-day metadata hours exist). */
  openingTime: string;
  closingTime: string;
  hours: StoreHours[];
  services: ServiceOffering[];
  reviews: Review[];
  ratingBreakdown: Record<number, number>;
  /** Cover customization options this store offers. `undefined` means the
   *  seller has not configured availability (all options shown); an empty
   *  array means none are offered. */
  availableCoverTypes?: string[];
  availableCoilTypes?: string[];
  availableCoverColors?: string[];
  availableHardCoverColors?: string[];
  availableHardFoilColors?: string[];
}

export interface OrderSpecifications {
  serviceId: string;
  paperType: 'standard' | 'digital' | 'premium' | 'glossy' | 'matte' | '';
  size: 'A4' | 'A3' | 'A2' | 'custom' | '';
  quantity: number;
  colorOption: 'color' | 'bw' | 'mixed';
  finishing: string[];
  // New fields for Hard Binding
  colorPages?: string; // Particular pages color (e.g. "5, 10-12")
  coverColor?: string;
  coverTextColor?: string;
  coverFileUrl?: string; // For the cover content what will be written in cover
  coverFileName?: string;
  coverFileUrls?: string[]; // For multiple cover designs if different per piece
  coverType?: string;
  applyCoverToAll?: boolean;
  spiralType?: string;
  coverDesignType?: 'default' | 'custom';
  frontCoverFileUrl?: string;
  frontCoverFileName?: string;
  backCoverFileUrl?: string;
  backCoverFileName?: string;
  /** Hard Binding: use page one of the document or a separate portrait PDF. */
  hardCoverFrontSource?: 'first-page' | 'upload';
  /** Hard Binding: optional foil text printed vertically on the spine. */
  printSpineText?: boolean;
  spineText?: string;
  /** Used to estimate the finished spine width. */
  paperGsm?: 75 | 100;
  /** Customer must approve the cover proof before continuing. */
  hardBindingProofApproved?: boolean;
  // Twin Loop Binding options.
  twinLoopWireColor?: string;
  twinLoopFrontCover?: string;
  twinLoopBackCover?: string;
  twinLoopBindingEdge?: 'left' | 'top';
  twinLoopPrintSides?: 'single' | 'double';
  twinLoopCalendarHanger?: boolean;
  twinLoopConcealed?: boolean;
  twinLoopSafeZoneAcknowledged?: boolean;
  twinLoopCoverSubmission?: 'embedded' | 'split' | 'mirror';
  twinLoopFrontPrintSides?: 'outside' | 'both';
  twinLoopBackPrintSides?: 'outside' | 'both';
  twinLoopFrontFileUrl?: string;
  twinLoopFrontFileName?: string;
  twinLoopBackFileUrl?: string;
  twinLoopBackFileName?: string;
  twinLoopMirrorBack?: 'wire-color' | 'blank-white';
  twinLoopCoverMaterial?: 'gloss-300' | 'matte-350';
  twinLoopBleedAcknowledged?: boolean;
  twinLoopFlipAcknowledged?: boolean;
  totalPages?: number;
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
  /** Binding services only — page printing component (₹). */
  pageCost?: number;
  /** Binding services only — binding/cover component (₹). */
  bindingCost?: number;
  /** Hard Binding: server-calculated spine width estimate. */
  spineWidthMm?: number;
  twinLoopPitch?: '3:1' | '2:1';
  twinLoopWireSize?: string;
  twinLoopTotalSheets?: number;
  billablePages?: number;
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
