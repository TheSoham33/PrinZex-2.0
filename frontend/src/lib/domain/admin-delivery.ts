/** Delivery partner (rider) records for the admin panel. */

export type DeliveryBoyStatus = 'active' | 'inactive' | 'suspended';

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  vehicleType: string;
  vehicleRegistration: string;
  insuranceExpiry: string;
  bankAccount: string;
  ifsc: string;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  status: DeliveryBoyStatus;
  verified: boolean;
  joinedAt: string;
  zones: string[];
  documents: Array<{
    type: string;
    label: string;
    fileName: string;
    status: 'verified' | 'needs_review' | 'rejected';
  }>;
  recentDeliveries: Array<{
    id: string;
    orderId: string;
    customer: string;
    earning: number;
    deliveredAt: string;
  }>;
}

export const DELIVERY_ZONES = [
  'Salt Lake',
  'New Town',
  'Sector V',
  'Koramangala',
  'HSR Layout',
  'Indiranagar',
];
