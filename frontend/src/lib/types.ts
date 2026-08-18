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
  matchedService?: {
    id: string;
    serviceName: string;
    basePrice: number;
    unit: string;
  } | null;
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
}

export interface OrderSpecifications {
  serviceId: string;
  paperType: 'standard' | 'premium' | 'glossy' | 'matte' | '';
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
