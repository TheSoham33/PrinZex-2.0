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
