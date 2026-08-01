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

const ddocs = (
  overrides?: Partial<Record<DeliveryDocument['type'], DeliveryDocument['status']>>,
): DeliveryDocument[] => [
  { type: 'id_proof', label: 'ID Proof', fileName: 'aadhaar.jpg', status: overrides?.id_proof ?? 'verified' },
  { type: 'driving_license', label: 'Driving License', fileName: 'dl-front.jpg', status: overrides?.driving_license ?? 'verified' },
  { type: 'address_proof', label: 'Address Proof', fileName: 'ration-card.pdf', status: overrides?.address_proof ?? 'verified' },
  { type: 'vehicle_insurance', label: 'Vehicle Insurance', fileName: 'insurance.pdf', status: overrides?.vehicle_insurance ?? 'verified' },
];

export const MOCK_DELIVERY_BOYS: DeliveryBoy[] = [
  {
    id: 'DLV-301',
    name: 'Sujoy Mondal',
    phone: '+91 98301 44521',
    email: 'sujoy.mondal@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Scooter',
    vehicleRegistration: 'WB 02 AF 7734',
    insuranceExpiry: '2027-03-18',
    bankAccount: '●●●●4471',
    ifsc: 'SBIN0001234',
    totalDeliveries: 1842,
    rating: 4.8,
    totalEarnings: 284600,
    status: 'active',
    verified: true,
    joinedAt: '2024-04-02',
    zones: ['Salt Lake', 'New Town'],
    documents: ddocs(),
    recentDeliveries: [
      { id: 'd1', orderId: 'ORD-7721', customer: 'Ananya Sen', deliveredAt: '2026-07-27T14:40:00+05:30', earning: 45 },
      { id: 'd2', orderId: 'ORD-4402', customer: 'Nikhil Saha', deliveredAt: '2026-07-26T17:10:00+05:30', earning: 60 },
    ],
  },
  {
    id: 'DLV-302',
    name: 'Rakesh Yadav',
    phone: '+91 98311 77820',
    email: 'rakesh.yadav@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Bike',
    vehicleRegistration: 'WB 06 K 2210',
    insuranceExpiry: '2026-11-02',
    bankAccount: '●●●●8829',
    ifsc: 'HDFC0000456',
    totalDeliveries: 2410,
    rating: 4.9,
    totalEarnings: 391200,
    status: 'active',
    verified: true,
    joinedAt: '2023-12-15',
    zones: ['South Kolkata', 'Behala'],
    documents: ddocs(),
    recentDeliveries: [
      { id: 'd3', orderId: 'ORD-4399', customer: 'Debolina Bose', deliveredAt: '2026-07-26T12:00:00+05:30', earning: 80 },
    ],
  },
  {
    id: 'DLV-303',
    name: 'Amit Halder',
    phone: '+91 98362 90014',
    email: 'amit.halder@prinzex.in',
    city: 'Howrah',
    vehicleType: 'Bike',
    vehicleRegistration: 'WB 11 C 5567',
    insuranceExpiry: '2026-08-30',
    bankAccount: '●●●●1102',
    ifsc: 'ICIC0002211',
    totalDeliveries: 764,
    rating: 4.3,
    totalEarnings: 118400,
    status: 'active',
    verified: true,
    joinedAt: '2025-05-19',
    zones: ['Howrah'],
    documents: ddocs(),
    recentDeliveries: [],
  },
  {
    id: 'DLV-304',
    name: 'Pritam Saha',
    phone: '+91 98040 33291',
    email: 'pritam.saha@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Bicycle',
    vehicleRegistration: '—',
    insuranceExpiry: '—',
    bankAccount: '●●●●6640',
    ifsc: 'PUNB0111000',
    totalDeliveries: 128,
    rating: 4.1,
    totalEarnings: 14200,
    status: 'inactive',
    verified: false,
    joinedAt: '2026-06-28',
    zones: ['North Kolkata'],
    documents: ddocs({ vehicle_insurance: 'needs_review', driving_license: 'needs_review' }),
    recentDeliveries: [],
  },
  {
    id: 'DLV-305',
    name: 'Sanjay Bera',
    phone: '+91 98745 11208',
    email: 'sanjay.bera@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Van',
    vehicleRegistration: 'WB 20 M 8890',
    insuranceExpiry: '2027-01-11',
    bankAccount: '●●●●3315',
    ifsc: 'AXIS0000789',
    totalDeliveries: 512,
    rating: 4.6,
    totalEarnings: 168900,
    status: 'active',
    verified: true,
    joinedAt: '2025-01-08',
    zones: ['Salt Lake', 'North Kolkata', 'New Town'],
    documents: ddocs(),
    recentDeliveries: [],
  },
  {
    id: 'DLV-306',
    name: 'Kaushik Dey',
    phone: '+91 98366 44017',
    email: 'kaushik.dey@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Scooter',
    vehicleRegistration: 'WB 04 J 1123',
    insuranceExpiry: '2026-09-05',
    bankAccount: '●●●●7758',
    ifsc: 'SBIN0004411',
    totalDeliveries: 341,
    rating: 3.6,
    totalEarnings: 48200,
    status: 'suspended',
    verified: true,
    joinedAt: '2025-09-12',
    zones: ['South Kolkata'],
    documents: ddocs({ address_proof: 'rejected' }),
    recentDeliveries: [],
  },
  {
    id: 'DLV-307',
    name: 'Nabin Roy',
    phone: '+91 98301 66742',
    email: 'nabin.roy@prinzex.in',
    city: 'Kolkata',
    vehicleType: 'Bike',
    vehicleRegistration: 'WB 08 P 3390',
    insuranceExpiry: '2027-05-20',
    bankAccount: '●●●●9902',
    ifsc: 'KKBK0000112',
    totalDeliveries: 96,
    rating: 4.0,
    totalEarnings: 11800,
    status: 'active',
    verified: false,
    joinedAt: '2026-07-14',
    zones: [],
    documents: ddocs({ id_proof: 'needs_review', address_proof: 'needs_review' }),
    recentDeliveries: [],
  },
  {
    id: 'DLV-308',
    name: 'Tapas Ghosh',
    phone: '+91 98315 22004',
    email: 'tapas.ghosh@prinzex.in',
    city: 'Howrah',
    vehicleType: 'Scooter',
    vehicleRegistration: 'WB 12 R 4408',
    insuranceExpiry: '2026-12-01',
    bankAccount: '●●●●5521',
    ifsc: 'BARB0HOWRAH',
    totalDeliveries: 1204,
    rating: 4.7,
    totalEarnings: 196300,
    status: 'active',
    verified: true,
    joinedAt: '2024-08-21',
    zones: ['Howrah', 'Behala'],
    documents: ddocs(),
    recentDeliveries: [],
  },
];
