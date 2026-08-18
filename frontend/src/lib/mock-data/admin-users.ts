/** Platform customer records for the admin Users page. */

export type AdminUserStatus = 'active' | 'blocked';

export interface UserOrderSummary {
  id: string;
  storeName: string;
  serviceName: string;
  total: number;
  status: string;
  placedAt: string;
}

export interface UserTransaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
}

export interface UserAddress {
  id: string;
  label: string;
  fullAddress: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  ordersPlaced: number;
  walletBalance: number;
  status: AdminUserStatus;
  lastLogin: string;
  lastDevice: string;
  lastIp: string;
  addresses: UserAddress[];
  recentOrders: UserOrderSummary[];
  recentTransactions: UserTransaction[];
}

const addr = (id: string, label: string, fullAddress: string): UserAddress => ({
  id,
  label,
  fullAddress,
});

export const MOCK_PLATFORM_USERS: PlatformUser[] = [
  {
    id: 'USR-1001',
    name: 'Ananya Sen',
    email: 'ananya.sen@gmail.com',
    phone: '+91 98300 45612',
    joinedAt: '2025-11-04',
    ordersPlaced: 24,
    walletBalance: 240,
    status: 'active',
    lastLogin: '2026-07-27T09:12:00+05:30',
    lastDevice: 'Chrome 141 · Android 15',
    lastIp: '103.48.12.77',
    addresses: [
      addr('a1', 'Home', 'Flat 4B, Green Apartments, Salt Lake, Kolkata 700091'),
      addr('a2', 'Office', 'Tech Park, Sector V, Salt Lake, Kolkata 700091'),
    ],
    recentOrders: [
      { id: 'ORD-7721', storeName: 'Print Master Pro', serviceName: 'Printing', total: 500, status: 'out_for_delivery', placedAt: '2026-07-26T09:15:00+05:30' },
      { id: 'ORD-1122', storeName: 'Print Master Pro', serviceName: 'Vinyl Banners', total: 300, status: 'delivered', placedAt: '2026-07-18T12:40:00+05:30' },
      { id: 'ORD-5566', storeName: 'Elite Press Studio', serviceName: 'Fine Art Prints', total: 1000, status: 'delivered', placedAt: '2026-06-28T11:00:00+05:30' },
    ],
    recentTransactions: [
      { id: 't1', type: 'debit', description: 'Order ORD-7721', amount: 500, date: '2026-07-26T09:15:00+05:30' },
      { id: 't2', type: 'credit', description: 'Wallet top-up via UPI', amount: 500, date: '2026-07-15T18:22:00+05:30' },
      { id: 't3', type: 'credit', description: 'Refund for ORD-0011', amount: 20, date: '2026-06-22T20:10:00+05:30' },
    ],
  },
  {
    id: 'USR-1002',
    name: 'Rahul Banerjee',
    email: 'rahul.b@outlook.com',
    phone: '+91 98311 55210',
    joinedAt: '2025-08-19',
    ordersPlaced: 41,
    walletBalance: 1250,
    status: 'active',
    lastLogin: '2026-07-27T07:44:00+05:30',
    lastDevice: 'Safari 18 · iOS 19',
    lastIp: '49.37.201.14',
    addresses: [addr('a3', 'Home', '12/3 Kestopur Main Road, Kolkata 700102')],
    recentOrders: [
      { id: 'ORD-4416', storeName: 'Banner Bazaar', serviceName: 'Vinyl Banners', total: 1620, status: 'processing', placedAt: '2026-07-27T06:50:00+05:30' },
    ],
    recentTransactions: [
      { id: 't4', type: 'credit', description: 'Wallet top-up via card', amount: 2000, date: '2026-07-20T10:05:00+05:30' },
      { id: 't5', type: 'debit', description: 'Order ORD-4416', amount: 750, date: '2026-07-27T06:50:00+05:30' },
    ],
  },
  {
    id: 'USR-1003',
    name: 'Priyanka Ghosh',
    email: 'priyanka.ghosh@yahoo.in',
    phone: '+91 98304 88991',
    joinedAt: '2026-01-12',
    ordersPlaced: 7,
    walletBalance: 0,
    status: 'active',
    lastLogin: '2026-07-25T20:30:00+05:30',
    lastDevice: 'Chrome 140 · Windows 11',
    lastIp: '117.203.9.221',
    addresses: [addr('a4', 'Hostel', 'Room 214, Jadavpur University Hostel, Kolkata 700032')],
    recentOrders: [
      { id: 'ORD-4415', storeName: 'Quick Copy Hub', serviceName: 'B&W Xerox', total: 480, status: 'new', placedAt: '2026-07-27T06:14:00+05:30' },
    ],
    recentTransactions: [],
  },
  {
    id: 'USR-1004',
    name: 'Vikram Agarwal',
    email: 'vikram.agarwal@corpmail.com',
    phone: '+91 98745 33218',
    joinedAt: '2024-06-02',
    ordersPlaced: 96,
    walletBalance: 3400,
    status: 'active',
    lastLogin: '2026-07-26T15:02:00+05:30',
    lastDevice: 'Edge 141 · Windows 11',
    lastIp: '182.72.44.9',
    addresses: [addr('a5', 'Office', '9 Camac Street, Kolkata 700017')],
    recentOrders: [
      { id: 'ORD-4412', storeName: 'Elite Press Studio', serviceName: 'Business Cards', total: 2250, status: 'accepted', placedAt: '2026-07-27T04:30:00+05:30' },
    ],
    recentTransactions: [
      { id: 't6', type: 'credit', description: 'Corporate wallet load', amount: 10000, date: '2026-07-01T09:00:00+05:30' },
    ],
  },
  {
    id: 'USR-1005',
    name: 'Meghna Roy',
    email: 'meghna.roy@gmail.com',
    phone: '+91 98362 41007',
    joinedAt: '2026-03-27',
    ordersPlaced: 12,
    walletBalance: 150,
    status: 'active',
    lastLogin: '2026-07-24T11:18:00+05:30',
    lastDevice: 'Chrome 141 · Android 14',
    lastIp: '106.51.77.140',
    addresses: [addr('a6', 'Cafe', '77 Diamond Harbour Road, Behala, Kolkata 700034')],
    recentOrders: [
      { id: 'ORD-4410', storeName: 'Quick Copy Hub', serviceName: 'Custom Stickers', total: 980, status: 'processing', placedAt: '2026-07-27T02:00:00+05:30' },
    ],
    recentTransactions: [
      { id: 't7', type: 'debit', description: 'Order ORD-4410', amount: 980, date: '2026-07-27T02:00:00+05:30' },
    ],
  },
  {
    id: 'USR-1006',
    name: 'Sourav Das',
    email: 'souravd@rediffmail.com',
    phone: '+91 98315 90042',
    joinedAt: '2025-05-15',
    ordersPlaced: 33,
    walletBalance: 60,
    status: 'blocked',
    lastLogin: '2026-06-11T13:40:00+05:30',
    lastDevice: 'Chrome 138 · Android 13',
    lastIp: '45.112.88.3',
    addresses: [addr('a7', 'Home', '31 GT Road, Salkia, Howrah 711106')],
    recentOrders: [
      { id: 'ORD-4408', storeName: 'Howrah Print House', serviceName: 'Spiral Binding', total: 640, status: 'cancelled', placedAt: '2026-06-10T18:00:00+05:30' },
    ],
    recentTransactions: [
      { id: 't8', type: 'credit', description: 'Refund — disputed order', amount: 640, date: '2026-06-12T10:00:00+05:30' },
    ],
  },
  {
    id: 'USR-1007',
    name: 'Ishita Chatterjee',
    email: 'ishita.c@artmail.in',
    phone: '+91 98301 27788',
    joinedAt: '2025-09-30',
    ordersPlaced: 18,
    walletBalance: 820,
    status: 'active',
    lastLogin: '2026-07-27T08:05:00+05:30',
    lastDevice: 'Safari 18 · macOS 16',
    lastIp: '157.32.18.204',
    addresses: [addr('a8', 'Studio', '14 Park Street, Kolkata 700016')],
    recentOrders: [
      { id: 'ORD-4405', storeName: 'Elite Press Studio', serviceName: 'Fine Art Prints', total: 4200, status: 'ready_for_pickup', placedAt: '2026-07-26T11:00:00+05:30' },
    ],
    recentTransactions: [],
  },
  {
    id: 'USR-1008',
    name: 'Nikhil Saha',
    email: 'nikhil.saha@gmail.com',
    phone: '+91 98040 66123',
    joinedAt: '2026-05-08',
    ordersPlaced: 4,
    walletBalance: 0,
    status: 'blocked',
    lastLogin: '2026-07-02T17:25:00+05:30',
    lastDevice: 'Chrome 139 · Android 14',
    lastIp: '223.190.6.55',
    addresses: [addr('a9', 'Home', 'Shop 4, City Centre, Salt Lake, Kolkata 700064')],
    recentOrders: [],
    recentTransactions: [],
  },
  {
    id: 'USR-1009',
    name: 'Debolina Bose',
    email: 'debolina.bose@gmail.com',
    phone: '+91 98366 10455',
    joinedAt: '2024-12-21',
    ordersPlaced: 57,
    walletBalance: 2100,
    status: 'active',
    lastLogin: '2026-07-27T10:30:00+05:30',
    lastDevice: 'Chrome 141 · Android 15',
    lastIp: '110.226.180.62',
    addresses: [addr('a10', 'Home', '52 Gariahat Road, Ballygunge, Kolkata 700019')],
    recentOrders: [
      { id: 'ORD-4399', storeName: 'Elite Press Studio', serviceName: 'Wedding Invitations', total: 8750, status: 'dispatched', placedAt: '2026-07-24T10:00:00+05:30' },
    ],
    recentTransactions: [
      { id: 't9', type: 'debit', description: 'Order ORD-4399', amount: 8750, date: '2026-07-24T10:00:00+05:30' },
    ],
  },
  {
    id: 'USR-1010',
    name: 'Arjun Mitra',
    email: 'arjun.mitra@gmail.com',
    phone: '+91 98300 12345',
    joinedAt: '2026-07-01',
    ordersPlaced: 2,
    walletBalance: 500,
    status: 'active',
    lastLogin: '2026-07-26T19:45:00+05:30',
    lastDevice: 'Chrome 141 · Windows 11',
    lastIp: '49.205.33.18',
    addresses: [addr('a11', 'Home', '188 Raja S C Mallick Road, Jadavpur, Kolkata 700032')],
    recentOrders: [
      { id: 'ORD-4390', storeName: 'ColorWorks Digital', serviceName: 'Photo Prints', total: 1500, status: 'delivered', placedAt: '2026-07-21T14:00:00+05:30' },
    ],
    recentTransactions: [
      { id: 't10', type: 'credit', description: 'Signup bonus', amount: 500, date: '2026-07-01T12:00:00+05:30' },
    ],
  },
  {
    id: 'USR-1011',
    name: 'Tanisha Paul',
    email: 'tanisha.paul@gmail.com',
    phone: '+91 98311 22440',
    joinedAt: '2025-02-14',
    ordersPlaced: 29,
    walletBalance: 75,
    status: 'active',
    lastLogin: '2026-07-23T08:55:00+05:30',
    lastDevice: 'Firefox 143 · Ubuntu 26.04',
    lastIp: '203.192.244.11',
    addresses: [addr('a12', 'Home', '7/1 Kestopur, Kolkata 700102')],
    recentOrders: [],
    recentTransactions: [],
  },
  {
    id: 'USR-1012',
    name: 'Imran Sheikh',
    email: 'imran.sheikh@gmail.com',
    phone: '+91 98362 55118',
    joinedAt: '2026-06-18',
    ordersPlaced: 6,
    walletBalance: 320,
    status: 'active',
    lastLogin: '2026-07-27T06:20:00+05:30',
    lastDevice: 'Chrome 141 · Android 13',
    lastIp: '171.61.90.204',
    addresses: [addr('a13', 'Home', '23A BD Block, Salt Lake, Kolkata 700064')],
    recentOrders: [],
    recentTransactions: [],
  },
];
