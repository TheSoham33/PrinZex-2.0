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
  /** Seller-configured quantity pricing slabs: "from qty, ₹rate per piece". */
  quantitySlabs?: { qty: number; rate: number }[];
  /** Document Printing stapling styles the seller offers → ₹ per set, keyed
   *  by catalogue option value ('loose' is always free and never listed). */
  staplingOptions?: Record<string, number>;
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
  /** Tape Binding tape colours the store offers (availability-only). */
  availableTapeColors?: string[];
}

export interface OrderSpecifications {
  serviceId: string;
  paperType: 'standard' | 'digital' | 'premium' | 'glossy' | 'matte' | '';
  /** Catalog-driven (paper-sizes group: A4/A5/A3 today) — not a closed set. */
  size: string;
  quantity: number;
  colorOption: 'color' | 'bw' | 'mixed';
  /** Document printing only: single-sided or duplex. Pricing stays per-page
   *  (a page = one side), so this is production info for the operator. */
  printSides?: 'single' | 'double';
  /** Document printing only: mandatory stapling choice from the
   *  'stapling-options' catalogue group. 'loose' (default) = Loose Sheet,
   *  free. Other styles charge the seller-set (or default) per-set price. */
  stapling?: string;
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
  // Tape Binding options.
  /** Tape colour (catalogue 'tape-colors' group; no surcharge). */
  tapeColor?: string;
  /** Front cover: first document page or a separate single-page design
   *  (PDF/PNG/JPG, 300 DPI minimum). */
  tapeCoverSource?: 'first-page' | 'upload';
  tapeFrontCoverFileUrl?: string;
  tapeFrontCoverFileName?: string;
  /** Optional back cover design, same format rules as the front. */
  tapeBackCoverFileUrl?: string;
  tapeBackCoverFileName?: string;
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
  // Business Cards customization.
  cardShape?: string;
  cardPaper?: string;
  cardSize?: string;
  cardCorners?: string;
  cardPrintSides?: 'single' | 'double';
  /** Double-sided, but the back reprints the front design — no separate
   *  back artwork required. */
  cardBackSameAsFront?: boolean;
  cardDesignSource?: 'template' | 'upload';
  cardTemplate?: string;
  cardFrontFileUrl?: string;
  cardFrontFileName?: string;
  cardBackFileUrl?: string;
  cardBackFileName?: string;
  /** Serialized card-studio docs (see card-studio/model.ts) for re-editing. */
  cardStudioFront?: string;
  cardStudioBack?: string;
  cardProofApproved?: boolean;
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
