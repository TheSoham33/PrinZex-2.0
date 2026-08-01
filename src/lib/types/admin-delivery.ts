/** Delivery partner records for the admin Delivery page. */

export type DeliveryStatus = 'active' | 'inactive' | 'suspended';

export interface DeliveryDocument {
  type: 'id_proof' | 'driving_license' | 'address_proof' | 'vehicle_insurance';
  label: string;
  fileName: string;
  status: 'verified' | 'needs_review' | 'rejected';
}

export interface DeliveryRecord {
  id: string;
  orderId: string;
  customer: string;
  deliveredAt: string;
  earning: number;
}

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  vehicleType: 'Bike' | 'Scooter' | 'Bicycle' | 'Van';
  vehicleRegistration: string;
  insuranceExpiry: string;
  bankAccount: string;
  ifsc: string;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  status: DeliveryStatus;
  verified: boolean;
  joinedAt: string;
  zones: string[];
  documents: DeliveryDocument[];
  recentDeliveries: DeliveryRecord[];
}

/** City zones a partner can be assigned to. */
export const DELIVERY_ZONES = [
  'North Kolkata',
  'South Kolkata',
  'Salt Lake',
  'New Town',
  'Howrah',
  'Behala',
];



