/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * PostgreSQL seed — run with `npm run db:seed`.
 *
 * Wipes all tables (FK-safe order) and recreates a deterministic dataset:
 *   1. 1 super admin          (admin@prinzex.com / Admin@123)
 *   2. 5 customers            (addresses + wallets + wallet transactions)
 *   3. 3 approved sellers     (services, bank details, verified documents, pincodes)
 *   4. 1 pending seller       (no documents yet)
 *   5. 3 active delivery boys (zones, bank details, verified documents)
 *   6. 10 orders              (every lifecycle status represented)
 *   7. deliveries             (for orders out_for_delivery or later)
 *   8. reviews                (for delivered orders)
 *   9. 3 coupons              (WELCOME10, FIRSTORDER, FLAT50)
 *  10. 5 support tickets      (one thread with messages)
 *
 * MongoDB seed (mongo-seed/seed.ts) builds linked documents on top of these.
 */

const prisma = new PrismaClient();

const hoursAgo = (h: number): Date => new Date(Date.now() - h * 60 * 60 * 1000);
const hoursFromNow = (h: number): Date => new Date(Date.now() + h * 60 * 60 * 1000);
const daysFromNow = (d: number): Date => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function wipe(): Promise<void> {
  console.log('… wiping existing rows (FK-safe order)');
  // children first
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.review.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.sellerInventory.deleteMany();
  await prisma.sellerTeamMember.deleteMany();
  await prisma.sellerPincode.deleteMany();
  await prisma.sellerDocument.deleteMany();
  await prisma.sellerBankDetails.deleteMany();
  await prisma.sellerService.deleteMany();
  await prisma.deliveryBoyZone.deleteMany();
  await prisma.deliveryBoyDocument.deleteMany();
  await prisma.deliveryBoyBankDetails.deleteMany();
  await prisma.deliveryBoy.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.adminRefreshToken.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
}

// ─── 1. SUPER ADMIN ────────────────────────────────────────────────────────
async function seedAdmin() {
  console.log('… creating super admin');
  return prisma.admin.create({
    data: {
      name: 'Super Admin',
      email: 'admin@prinzex.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'SUPER_ADMIN',
      isActive: true,
      lastLoginAt: hoursAgo(2),
    },
  });
}

// ─── 2. CUSTOMERS (+addresses, +wallets, +transactions) ────────────────────
const CUSTOMERS: Array<{
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  walletBalance: number;
  loyaltyPoints: number;
  addresses: Array<{
    label: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
    isDefault: boolean;
  }>;
}> = [
  {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+919800000001',
    referralCode: 'AARAV10',
    walletBalance: 500,
    loyaltyPoints: 120,
    addresses: [
      {
        label: 'Home',
        fullAddress: 'Flat 4B, 80 Feet Road, Koramangala 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        lat: 12.9352,
        lng: 77.6245,
        isDefault: true,
      },
      {
        label: 'Office',
        fullAddress: '3rd Floor, Prestige Towers, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        lat: 12.9758,
        lng: 77.6014,
        isDefault: false,
      },
    ],
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    phone: '+919800000002',
    referralCode: 'PRIYA10',
    walletBalance: 250,
    loyaltyPoints: 60,
    addresses: [
      {
        label: 'Home',
        fullAddress: '212, 100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        lat: 12.9719,
        lng: 77.6412,
        isDefault: true,
      },
    ],
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    phone: '+919800000003',
    referralCode: 'ROHAN10',
    walletBalance: 1000,
    loyaltyPoints: 340,
    addresses: [
      {
        label: 'Home',
        fullAddress: 'Sector 2, 27th Main, HSR Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560102',
        lat: 12.9116,
        lng: 77.6474,
        isDefault: true,
      },
    ],
  },
  {
    name: 'Sneha Patil',
    email: 'sneha.patil@example.com',
    phone: '+919800000004',
    referralCode: 'SNEHA10',
    walletBalance: 50,
    loyaltyPoints: 15,
    addresses: [
      {
        label: 'Home',
        fullAddress: 'B-1203, Sobha City, Thanisandra Main Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560077',
        lat: 13.0627,
        lng: 77.6399,
        isDefault: true,
      },
    ],
  },
  {
    name: 'Vikram Reddy',
    email: 'vikram.reddy@example.com',
    phone: '+919800000005',
    referralCode: 'VIKRAM10',
    walletBalance: 150,
    loyaltyPoints: 40,
    addresses: [
      {
        label: 'Home',
        fullAddress: '9th Cross, 5th Main, BTM Layout 2nd Stage',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560076',
        lat: 12.9166,
        lng: 77.6101,
        isDefault: true,
      },
    ],
  },
];

async function seedCustomers() {
  console.log('… creating 5 customers with addresses and wallets');
  const passwordHash = await bcrypt.hash('Customer@123', 10);
  const created = [];

  for (const c of CUSTOMERS) {
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: true,
        isPhoneVerified: true,
        referralCode: c.referralCode,
        addresses: {
          create: c.addresses.map((a) => ({
            label: a.label,
            fullAddress: a.fullAddress,
            city: a.city,
            state: a.state,
            pincode: a.pincode,
            lat: a.lat,
            lng: a.lng,
            phone: c.phone,
            isDefault: a.isDefault,
          })),
        },
        wallet: {
          create: {
            balance: c.walletBalance,
            loyaltyPoints: c.loyaltyPoints,
            transactions: {
              create: [
                {
                  type: 'CREDIT',
                  reason: 'WALLET_TOPUP',
                  amount: c.walletBalance,
                  description: 'Wallet top-up via Razorpay',
                },
                {
                  type: 'CREDIT',
                  reason: 'CASHBACK',
                  amount: 25,
                  description: 'Welcome cashback',
                },
              ],
            },
          },
        },
      },
      include: { addresses: true, wallet: true },
    });
    created.push(user);
  }
  return created;
}

// ─── 3 & 4. SELLERS ────────────────────────────────────────────────────────
const SELLERS: Array<{
  ownerName: string;
  storeName: string;
  email: string;
  phone: string;
  gstNumber: string;
  businessType: string;
  storeAddress: string;
  pincode: string;
  lat: number;
  lng: number;
  openingTime: string;
  closingTime: string;
  description: string;
  status: 'APPROVED' | 'PENDING';
  isVerified: boolean;
  averageRating: number;
  totalOrders: number;
  completionRate: number;
  onTimeRate: number;
  servedPincodes: string[];
  services: Array<{
    categoryId: string;
    categoryName: string;
    serviceId: string;
    serviceName: string;
    basePrice: number;
    unit: string;
  }>;
  documents: string[];
  account: { holder: string; number: string; ifsc: string; pan: string };
  /** Seller-set pricing overrides stored in Seller.metadata. */
  pricingOverrides?: {
    pageRate?: { bw: number; color: number };
    coverType?: Record<string, number>;
    coilType?: Record<string, number>;
    coverColor?: Record<string, number>;
  };
}> = [
  {
    ownerName: 'Ramesh Gupta',
    storeName: 'PrintHub Studios',
    email: 'seller1@prinzex.com',
    phone: '+919110000001',
    gstNumber: '29ABCDE1234F1Z5',
    businessType: 'Private Limited',
    storeAddress: '45, 6th Block, Koramangala',
    pincode: '560034',
    lat: 12.9345,
    lng: 77.61,
    openingTime: '09:00',
    closingTime: '21:00',
    description: 'Full-service digital print studio — documents, business cards, photo prints.',
    status: 'APPROVED',
    isVerified: true,
    averageRating: 4.6,
    totalOrders: 120,
    completionRate: 98.5,
    onTimeRate: 96.2,
    servedPincodes: ['560034', '560095', '560030'],
    services: [
      { categoryId: 'documents', categoryName: 'Documents', serviceId: 'doc-print', serviceName: 'Document Printing', basePrice: 2.0, unit: 'per page' },
      { categoryId: 'specialty', categoryName: 'Specialty Printing', serviceId: 'spec-photo-prints', serviceName: 'Photo Print', basePrice: 99.0, unit: 'per set' },
    ],
    documents: ['gst_certificate', 'business_license', 'owner_id', 'address_proof'],
    account: { holder: 'Ramesh Gupta', number: '50100234567890', ifsc: 'HDFC0001234', pan: 'ABCDE1234F' },
    pricingOverrides: { pageRate: { bw: 2, color: 10 } },
  },
  {
    ownerName: 'Anil Deshmukh',
    storeName: 'QuickCopy Express',
    email: 'seller2@prinzex.com',
    phone: '+919110000002',
    gstNumber: '29FGHIJ5678K2Z6',
    businessType: 'Proprietorship',
    storeAddress: '100 Feet Road, Indiranagar',
    pincode: '560038',
    lat: 12.9719,
    lng: 77.6412,
    openingTime: '08:30',
    closingTime: '22:00',
    description: 'Fast photocopying, binding and lamination for students and offices.',
    status: 'APPROVED',
    isVerified: true,
    averageRating: 4.3,
    totalOrders: 210,
    completionRate: 97.1,
    onTimeRate: 94.8,
    servedPincodes: ['560038', '560008', '560066'],
    services: [
      { categoryId: 'documents', categoryName: 'Documents', serviceId: 'doc-print', serviceName: 'Document Printing', basePrice: 1.5, unit: 'per page' },
      { categoryId: 'binding', categoryName: 'Book binding & finishing', serviceId: 'bind-spiral', serviceName: 'Spiral Binding', basePrice: 60.0, unit: 'per document' },
    ],
    documents: ['gst_certificate', 'business_license', 'owner_id', 'address_proof'],
    account: { holder: 'Anil Deshmukh', number: '50200345678901', ifsc: 'ICIC0005678', pan: 'FGHIJ5678K' },
    pricingOverrides: {
      pageRate: { bw: 1.5, color: 9 },
      // Extras are added ON TOP of the ₹60 base binding price. Standard
      // options (clear cover, plastic coil) cost nothing extra.
      coverType: { clear: 0, frosted: 5, printed: 15, opaque: 10 },
      coilType: { plastic: 0, 'wire-o': 15 },
      coverColor: {},
    },
  },
  {
    ownerName: 'Kavitha Rao',
    storeName: 'PixelPrint Works',
    email: 'seller3@prinzex.com',
    phone: '+919110000003',
    gstNumber: '29KLMNO9012P3Z7',
    businessType: 'Partnership',
    storeAddress: '27th Main, HSR Layout Sector 1',
    pincode: '560102',
    lat: 12.9116,
    lng: 77.6474,
    openingTime: '10:00',
    closingTime: '20:30',
    description: 'Large-format printing — posters, flex banners, custom invitations.',
    status: 'APPROVED',
    isVerified: true,
    averageRating: 4.8,
    totalOrders: 85,
    completionRate: 99.0,
    onTimeRate: 97.5,
    servedPincodes: ['560102', '560068', '560076'],
    services: [
      { categoryId: 'large-format', categoryName: 'Large format printing', serviceId: 'lf-flex-banner', serviceName: 'Flex Banners', basePrice: 499.0, unit: 'per sqft' },
      { categoryId: 'specialty', categoryName: 'Specialty printing', serviceId: 'spec-canvas', serviceName: 'Canvas Print', basePrice: 12.0, unit: 'per piece' },
    ],
    documents: ['gst_certificate', 'business_license', 'owner_id', 'address_proof'],
    account: { holder: 'Kavitha Rao', number: '50300456789012', ifsc: 'SBIN0009012', pan: 'KLMNO9012P' },
  },
  {
    ownerName: 'Mohan Lal',
    storeName: 'Campus Print Corner',
    email: 'seller4@prinzex.com',
    phone: '+919110000004',
    gstNumber: '29PQRST3456Q4Z8',
    businessType: 'Proprietorship',
    storeAddress: 'Hosur Road, Near Christ University',
    pincode: '560029',
    lat: 12.9349,
    lng: 77.6055,
    openingTime: '09:00',
    closingTime: '20:00',
    description: 'Student-friendly photocopy and project printing kiosk. Awaiting KYC review.',
    status: 'PENDING',
    isVerified: false,
    averageRating: 0,
    totalOrders: 0,
    completionRate: 0,
    onTimeRate: 0,
    servedPincodes: ['560029', '560030'],
    services: [
      { categoryId: 'documents', categoryName: 'Documents', serviceId: 'doc-print', serviceName: 'Document Printing', basePrice: 1.0, unit: 'per page' },
    ],
    documents: [], // pending seller — no documents uploaded yet
    account: { holder: 'Mohan Lal', number: '50400567890123', ifsc: 'UTIB0003456', pan: 'PQRST3456Q' },
    pricingOverrides: { pageRate: { bw: 1, color: 7 } },
  },
];

async function seedSellers(adminId: string) {
  console.log('… creating 3 approved sellers + 1 pending seller');
  const passwordHash = await bcrypt.hash('Seller@123', 10);
  const created = [];

  for (const s of SELLERS) {
    const sellerUser = await prisma.user.create({
      data: {
        name: s.ownerName,
        email: s.email,
        phone: s.phone,
        passwordHash,
        role: 'SELLER',
        isEmailVerified: s.isVerified,
        isPhoneVerified: true,
      },
    });

    const seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: s.storeName,
        ownerName: s.ownerName,
        email: s.email,
        phone: s.phone,
        gstNumber: s.gstNumber,
        businessType: s.businessType,
        storeAddress: s.storeAddress,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: s.pincode,
        lat: s.lat,
        lng: s.lng,
        openingTime: s.openingTime,
        closingTime: s.closingTime,
        description: s.description,
        status: s.status,
        commissionRate: 0.12,
        deliveryRadius: 10,
        isVerified: s.isVerified,
        averageRating: s.averageRating,
        totalOrders: s.totalOrders,
        completionRate: s.completionRate,
        onTimeRate: s.onTimeRate,
        metadata: s.pricingOverrides ? { pricingOverrides: s.pricingOverrides } : undefined,
        services: { create: s.services },
        pincodes: { create: s.servedPincodes.map((pincode) => ({ pincode, isExcluded: false })) },
        bankDetails: {
          create: {
            accountHolderName: s.account.holder,
            accountNumber: s.account.number,
            ifscCode: s.account.ifsc,
            panNumber: s.account.pan,
            isVerified: s.isVerified,
          },
        },
        documents: {
          create: s.documents.map((docType) => ({
            docType,
            fileUrl: `https://cdn.prinzex.com/docs/${docType}.pdf`,
            isVerified: s.isVerified,
            verifiedAt: s.isVerified ? hoursAgo(72) : null,
            verifiedBy: s.isVerified ? adminId : null,
          })),
        },
      },
      include: { services: true },
    });
    created.push(seller);
  }
  return created;
}

// ─── 5. DELIVERY BOYS ──────────────────────────────────────────────────────
const DELIVERY_BOYS: Array<{
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleRegNo: string;
  licenseNumber: string;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  averageRating: number;
  totalDeliveries: number;
  onTimeRate: number;
  totalEarnings: number;
  zones: string[];
  account: { holder: string; number: string; ifsc: string; pan: string };
}> = [
  {
    name: 'Imran Khan',
    phone: '+919700000001',
    email: 'imran.khan@example.com',
    vehicleType: 'bike',
    vehicleRegNo: 'KA01AB1234',
    licenseNumber: 'KA0120220012345',
    isOnline: true,
    currentLat: 12.9358,
    currentLng: 77.62,
    averageRating: 4.7,
    totalDeliveries: 480,
    onTimeRate: 96.5,
    totalEarnings: 38400,
    zones: ['Koramangala', 'HSR Layout'],
    account: { holder: 'Imran Khan', number: '60100678901234', ifsc: 'HDFC0004321', pan: 'QRSTU3456V' },
  },
  {
    name: 'Sunil Verma',
    phone: '+919700000002',
    email: 'sunil.verma@example.com',
    vehicleType: 'scooter',
    vehicleRegNo: 'KA05CD5678',
    licenseNumber: 'KA0520210054321',
    isOnline: true,
    currentLat: 12.9725,
    currentLng: 77.635,
    averageRating: 4.4,
    totalDeliveries: 320,
    onTimeRate: 93.9,
    totalEarnings: 24500,
    zones: ['Indiranagar', 'Domlur'],
    account: { holder: 'Sunil Verma', number: '60200789012345', ifsc: 'ICIC0008765', pan: 'VWXYZ6789A' },
  },
  {
    name: 'Deepak Yadav',
    phone: '+919700000003',
    email: 'deepak.yadav@example.com',
    vehicleType: 'bike',
    vehicleRegNo: 'KA03EF9012',
    licenseNumber: 'KA0320230098765',
    isOnline: false,
    currentLat: 12.912,
    currentLng: 77.64,
    averageRating: 4.9,
    totalDeliveries: 610,
    onTimeRate: 98.1,
    totalEarnings: 52100,
    zones: ['HSR Layout', 'BTM Layout'],
    account: { holder: 'Deepak Yadav', number: '60300890123456', ifsc: 'SBIN0002109', pan: 'BCDEF9012G' },
  },
];

async function seedDeliveryBoys() {
  console.log('… creating 3 active delivery boys with zones');
  const passwordHash = await bcrypt.hash('Delivery@123', 10);
  const created = [];

  for (const d of DELIVERY_BOYS) {
    const boyUser = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash,
        role: 'DELIVERY_BOY',
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    const boy = await prisma.deliveryBoy.create({
      data: {
        userId: boyUser.id,
        name: d.name,
        phone: d.phone,
        email: d.email,
        city: 'Bengaluru',
        status: 'ACTIVE',
        isOnline: d.isOnline,
        currentLat: d.currentLat,
        currentLng: d.currentLng,
        vehicleType: d.vehicleType,
        vehicleRegNo: d.vehicleRegNo,
        licenseNumber: d.licenseNumber,
        averageRating: d.averageRating,
        totalDeliveries: d.totalDeliveries,
        onTimeRate: d.onTimeRate,
        totalEarnings: d.totalEarnings,
        zones: { create: d.zones.map((zoneName) => ({ zoneName })) },
        bankDetails: {
          create: {
            accountHolderName: d.account.holder,
            accountNumber: d.account.number,
            ifscCode: d.account.ifsc,
            panNumber: d.account.pan,
          },
        },
        documents: {
          create: [
            { docType: 'id_proof', fileUrl: 'https://cdn.prinzex.com/docs/id_proof.pdf', isVerified: true },
            { docType: 'license', fileUrl: 'https://cdn.prinzex.com/docs/license.pdf', isVerified: true },
            {
              docType: 'vehicle_insurance',
              fileUrl: 'https://cdn.prinzex.com/docs/vehicle_insurance.pdf',
              isVerified: true,
              expiryDate: daysFromNow(365),
            },
          ],
        },
      },
      include: { zones: true },
    });
    created.push(boy);
  }
  return created;
}

// ─── 6–7. ORDERS + ITEMS + DELIVERIES ──────────────────────────────────────
type CustomerWithAddresses = Awaited<ReturnType<typeof seedCustomers>>[number];
type SellerWithServices = Awaited<ReturnType<typeof seedSellers>>[number];

interface OrderSeed {
  status: string;
  placedHoursAgo: number;
  customerIndex: number;
  sellerIndex: number;
  items: Array<{ serviceKey: string; quantity: number; specs: Record<string, string | number | boolean>; fileUrl?: string }>;
  deliverySpeed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP';
  isRush?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  cancelReason?: string;
  specialInstructions?: string;
  couponCode?: string;
  discount?: number;
}

const ORDER_SEEDS: OrderSeed[] = [
  {
    status: 'delivered', placedHoursAgo: 192, customerIndex: 0, sellerIndex: 0,
    items: [
      { serviceKey: 'doc-print', quantity: 10, specs: { paperType: 'Glossy 120gsm', size: 'A4', color: 'colour', sides: 'single' }, fileUrl: 'https://cdn.prinzex.com/uploads/brochure.pdf' },
      { serviceKey: 'spec-photo-prints', quantity: 1, specs: { paperType: 'Matte 300gsm', finish: 'matte_lamination', sides: 'double' }, fileUrl: 'https://cdn.prinzex.com/uploads/card_design.ai' },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'paid',
  },
  {
    status: 'delivered', placedHoursAgo: 120, customerIndex: 1, sellerIndex: 1,
    items: [
      { serviceKey: 'doc-print', quantity: 100, specs: { paperType: 'Bond 75gsm', size: 'A4', color: 'bw', sides: 'double' }, fileUrl: 'https://cdn.prinzex.com/uploads/thesis.pdf' },
      { serviceKey: 'bind-spiral', quantity: 2, specs: { bindingColor: 'black', cover: 'transparent' } },
    ],
    deliverySpeed: 'EXPRESS', isRush: true, paymentMethod: 'wallet', paymentStatus: 'paid', couponCode: 'WELCOME10', discount: 25,
  },
  {
    status: 'out_for_delivery', placedHoursAgo: 3, customerIndex: 2, sellerIndex: 0,
    items: [
      { serviceKey: 'spec-photo-prints', quantity: 2, specs: { background: 'white', size: '35x45mm' }, fileUrl: 'https://cdn.prinzex.com/uploads/face.jpg' },
      { serviceKey: 'doc-print', quantity: 20, specs: { paperType: 'Bond 75gsm', size: 'A4', color: 'bw', sides: 'single' }, fileUrl: 'https://cdn.prinzex.com/uploads/forms.pdf' },
    ],
    deliverySpeed: 'SAME_DAY', isRush: true, paymentMethod: 'razorpay', paymentStatus: 'paid',
    specialInstructions: 'Call on arrival — gate security will hold the package.',
  },
  {
    status: 'out_for_delivery', placedHoursAgo: 5, customerIndex: 3, sellerIndex: 2,
    items: [
      { serviceKey: 'lf-flex-banner', quantity: 3, specs: { paperType: 'Art paper 170gsm', size: 'A3', lamination: 'gloss' }, fileUrl: 'https://cdn.prinzex.com/uploads/poster.pdf' },
      { serviceKey: 'spec-canvas', quantity: 50, specs: { paperType: 'Ivory 250gsm', size: '5x7in', envelope: true }, fileUrl: 'https://cdn.prinzex.com/uploads/invite.pdf' },
    ],
    deliverySpeed: 'EXPRESS', paymentMethod: 'cod', paymentStatus: 'pending',
  },
  {
    status: 'ready_for_pickup', placedHoursAgo: 4, customerIndex: 4, sellerIndex: 1,
    items: [
      { serviceKey: 'doc-print', quantity: 10, specs: { size: 'A4', thickness: '125micron' } },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'paid',
  },
  {
    status: 'processing', placedHoursAgo: 2, customerIndex: 0, sellerIndex: 2,
    items: [
      { serviceKey: 'lf-flex-banner', quantity: 4, specs: { material: 'normal_flex', eyelets: true, dimensions: '2x3ft' }, fileUrl: 'https://cdn.prinzex.com/uploads/shop_banner.pdf' },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'paid',
  },
  {
    status: 'confirmed', placedHoursAgo: 24, customerIndex: 1, sellerIndex: 0,
    items: [
      { serviceKey: 'doc-print', quantity: 30, specs: { paperType: 'Bond 75gsm', size: 'A4', color: 'bw', sides: 'double' }, fileUrl: 'https://cdn.prinzex.com/uploads/notes.pdf' },
    ],
    deliverySpeed: 'PICKUP', paymentMethod: 'cod', paymentStatus: 'pending',
  },
  {
    status: 'placed', placedHoursAgo: 1, customerIndex: 2, sellerIndex: 1,
    items: [
      { serviceKey: 'doc-print', quantity: 5, specs: { paperType: 'Glossy 120gsm', size: 'A4', color: 'colour', sides: 'single' } },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'pending',
  },
  {
    status: 'placed', placedHoursAgo: 0.5, customerIndex: 4, sellerIndex: 2,
    items: [
      { serviceKey: 'spec-canvas', quantity: 100, specs: { paperType: 'Metallic 300gsm', size: '5x7in', envelope: true }, fileUrl: 'https://cdn.prinzex.com/uploads/wedding_invite.pdf' },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'pending',
  },
  {
    status: 'cancelled', placedHoursAgo: 72, customerIndex: 3, sellerIndex: 0,
    items: [
      { serviceKey: 'spec-photo-prints', quantity: 1, specs: { paperType: 'Matte 300gsm', finish: 'spot_uv', sides: 'double' }, fileUrl: 'https://cdn.prinzex.com/uploads/old_card.ai' },
    ],
    deliverySpeed: 'STANDARD', paymentMethod: 'razorpay', paymentStatus: 'refunded',
    cancelReason: 'Change in design requirements after placing the order',
  },
];

function deliveryFeeFor(speed: OrderSeed['deliverySpeed']): number {
  switch (speed) {
    case 'PICKUP': return 0;
    case 'SAME_DAY': return 80;
    case 'EXPRESS': return 50;
    default: return 30;
  }
}

function estimatedHoursFor(speed: OrderSeed['deliverySpeed']): number {
  switch (speed) {
    case 'PICKUP': return 4;
    case 'SAME_DAY': return 6;
    case 'EXPRESS': return 12;
    default: return 48;
  }
}

async function seedOrders(
  customers: CustomerWithAddresses[],
  sellers: SellerWithServices[],
) {
  console.log('… creating 10 orders across statuses');
  const approved = sellers.filter((s) => s.status === 'APPROVED');
  const orders = [];

  for (const seed of ORDER_SEEDS) {
    const customer = customers[seed.customerIndex];
    const seller = approved[seed.sellerIndex];
    const address = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];

    const items = seed.items.map((item) => {
      const service = seller.services.find((s) => s.serviceId === item.serviceKey);
      if (!service) throw new Error(`Service ${item.serviceKey} missing for ${seller.storeName}`);
      const unitPrice = Number(service.basePrice);
      return {
        sellerServiceId: service.id,
        serviceName: service.serviceName,
        quantity: item.quantity,
        unitPrice,
        total: Number((unitPrice * item.quantity).toFixed(2)),
        specifications: item.specs,
        fileUrl: item.fileUrl ?? null,
      };
    });

    const subtotal = Number(items.reduce((sum, i) => sum + i.total, 0).toFixed(2));
    const deliveryFee = deliveryFeeFor(seed.deliverySpeed);
    const rushFee = seed.isRush ? 50 : 0;
    const tax = Number((subtotal * 0.05).toFixed(2));
    const discount = seed.discount ?? 0;
    const total = Number((subtotal + deliveryFee + rushFee + tax - discount).toFixed(2));
    const commissionAmount = Number((subtotal * 0.12).toFixed(2));
    const isCancelled = seed.status === 'cancelled';

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        sellerId: seller.id,
        status: seed.status,
        total,
        subtotal,
        deliveryFee,
        rushFee,
        tax,
        discount,
        commissionAmount,
        deliverySpeed: seed.deliverySpeed,
        deliveryAddress: {
          label: address.label,
          fullAddress: address.fullAddress,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
          lat: address.lat,
          lng: address.lng,
        },
        estimatedDelivery: hoursFromNow(estimatedHoursFor(seed.deliverySpeed)),
        specialInstructions: seed.specialInstructions ?? null,
        couponCode: seed.couponCode ?? null,
        paymentMethod: seed.paymentMethod ?? 'razorpay',
        paymentStatus: seed.paymentStatus ?? 'pending',
        paymentId: seed.paymentStatus === 'paid' || seed.paymentStatus === 'refunded' ? `pay_seed_${Math.round(seed.placedHoursAgo)}` : null,
        isRush: seed.isRush ?? false,
        cancelledAt: isCancelled ? hoursAgo(seed.placedHoursAgo - 1) : null,
        cancelReason: seed.cancelReason ?? null,
        createdAt: hoursAgo(seed.placedHoursAgo),
        items: { create: items },
      },
      include: { items: true },
    });
    orders.push(order);
  }
  return orders;
}

async function seedDeliveries(
  orders: Awaited<ReturnType<typeof seedOrders>>,
  deliveryBoys: Awaited<ReturnType<typeof seedDeliveryBoys>>,
) {
  console.log('… creating deliveries for out_for_delivery / delivered orders');
  // FK-safe assignment: out_for_delivery & delivered orders each get a Delivery row.
  const assignment: Record<string, { boyIndex: number; status: string }> = {
    delivered: { boyIndex: 0, status: 'delivered' },
    out_for_delivery: { boyIndex: 0, status: 'out_for_delivery' },
  };

  let deliveredBoyCursor = 0;
  for (const order of orders) {
    const mapped = assignment[order.status];
    if (!mapped) continue;

    if (order.status === 'delivered') {
      // spread delivered orders over boys 0 and 1
      mapped.boyIndex = deliveredBoyCursor;
      deliveredBoyCursor = (deliveredBoyCursor + 1) % 2;
    }
    const boy = deliveryBoys[mapped.boyIndex === 0 && order.status === 'out_for_delivery' ? 0 : mapped.boyIndex];
    const chosenBoy = order.status === 'out_for_delivery' && orders.indexOf(order) === 3 ? deliveryBoys[2] : boy;

    const isDelivered = order.status === 'delivered';
    await prisma.delivery.create({
      data: {
        orderId: order.id,
        deliveryBoyId: chosenBoy.id,
        status: isDelivered ? 'delivered' : 'out_for_delivery',
        pickedUpAt: hoursAgo(isDelivered ? 20 : 1),
        deliveredAt: isDelivered ? hoursAgo(18) : null,
        podPhotoUrl: isDelivered ? 'https://cdn.prinzex.com/pod/photo.jpg' : null,
        podSignatureUrl: isDelivered ? 'https://cdn.prinzex.com/pod/signature.png' : null,
        podOtp: '4821',
        podOtpVerified: isDelivered,
        earningsAmount: isDelivered ? Number(order.deliveryFee) + Number(order.rushFee) : 0,
        notes: isDelivered ? 'Delivered to customer in person' : 'Package picked up from store',
      },
    });
  }

  // Backfill rider earning aggregates for the delivered seed deliveries so
  // /api/delivery/earnings and pending balances demo realistically.
  const deliveredRows = await prisma.delivery.findMany({
    where: { status: 'delivered' },
    select: { deliveryBoyId: true, earningsAmount: true },
  });
  const perBoy = new Map<string, { earnings: number; count: number }>();
  for (const row of deliveredRows) {
    if (!row.deliveryBoyId) continue;
    const entry = perBoy.get(row.deliveryBoyId) ?? { earnings: 0, count: 0 };
    entry.earnings += Number(row.earningsAmount);
    entry.count += 1;
    perBoy.set(row.deliveryBoyId, entry);
  }
  for (const [boyId, entry] of perBoy) {
    await prisma.deliveryBoy.update({
      where: { id: boyId },
      data: { totalEarnings: entry.earnings, pendingEarnings: entry.earnings, totalDeliveries: entry.count },
    });
  }
}

// ─── 8. REVIEWS ────────────────────────────────────────────────────────────
async function seedReviews(
  orders: Awaited<ReturnType<typeof seedOrders>>,
  deliveryBoys: Awaited<ReturnType<typeof seedDeliveryBoys>>,
  sellers: SellerWithServices[],
) {
  console.log('… creating reviews for delivered orders');
  const delivered = orders.filter((o) => o.status === 'delivered');

  const [first, second] = delivered;
  await prisma.review.create({
    data: {
      orderId: first.id,
      customerId: first.customerId,
      entityType: 'STORE',
      entityId: first.sellerId,
      overallRating: 5,
      qualityRating: 5,
      deliveryRating: 5,
      communicationRating: 5,
      valueRating: 4,
      comment: 'Crisp colour prints and the business cards came out perfectly. Great experience!',
      photoUrls: ['https://cdn.prinzex.com/reviews/cards.jpg'],
      createdAt: hoursAgo(160),
    },
  });

  await prisma.review.create({
    data: {
      orderId: second.id,
      customerId: second.customerId,
      entityType: 'DELIVERY_BOY',
      entityId: deliveryBoys[1].id,
      overallRating: 4,
      qualityRating: 4,
      deliveryRating: 4,
      communicationRating: 4,
      valueRating: 4,
      comment: 'Thesis bound neatly and delivered ahead of time. Slight delay in pickup updates.',
      photoUrls: [],
      sellerReply: 'Thank you for the feedback — we have tightened our pickup scan process.',
      sellerRepliedAt: hoursAgo(100),
      createdAt: hoursAgo(110),
    },
  });

  void sellers;
}

// ─── 9. COUPONS ────────────────────────────────────────────────────────────
async function seedCoupons() {
  console.log('… creating 3 coupons');
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 199,
        maxDiscount: 100,
        usageLimit: 500,
        perUserLimit: 1,
        expiresAt: daysFromNow(90),
      },
      {
        code: 'FIRSTORDER',
        discountType: 'flat',
        discountValue: 50,
        minOrderValue: 149,
        usageLimit: 1000,
        perUserLimit: 1,
        expiresAt: daysFromNow(180),
      },
      {
        code: 'FLAT50',
        discountType: 'flat',
        discountValue: 50,
        minOrderValue: 299,
        usageLimit: 300,
        usageCount: 12,
        perUserLimit: 3,
        expiresAt: daysFromNow(30),
      },
    ],
  });
}

// ─── 10. SUPPORT TICKETS ───────────────────────────────────────────────────
async function seedSupportTickets(
  customers: CustomerWithAddresses[],
  orders: Awaited<ReturnType<typeof seedOrders>>,
  adminId: string,
) {
  console.log('… creating 5 support tickets');
  const deliveredOrder = orders.find((o) => o.status === 'delivered');
  const cancelledOrder = orders.find((o) => o.status === 'cancelled');

  await prisma.supportTicket.create({
    data: {
      userId: customers[0].id,
      orderId: deliveredOrder?.id,
      subject: 'Print quality issue with photos',
      category: 'QUALITY_ISSUE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTo: adminId,
      messages: {
        create: [
          {
            senderType: 'customer',
            senderId: customers[0].id,
            content: 'Some of the photo prints came out darker than the file preview. Can this be reprinted?',
          },
          {
            senderType: 'admin',
            senderId: adminId,
            content: 'We are checking with the store on their printer calibration and will reprint if needed.',
          },
        ],
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      userId: customers[1].id,
      subject: 'Delivery delayed beyond ETA',
      category: 'DELIVERY_ISSUE',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
  });

  await prisma.supportTicket.create({
    data: {
      userId: customers[3].id,
      orderId: cancelledOrder?.id,
      subject: 'Refund not received for cancelled order',
      category: 'PAYMENT_ISSUE',
      priority: 'HIGH',
      status: 'RESOLVED',
      assignedTo: adminId,
      resolvedAt: hoursAgo(10),
    },
  });

  await prisma.supportTicket.create({
    data: {
      userId: customers[4].id,
      subject: 'Coupon code not applying at checkout',
      category: 'OTHER',
      priority: 'LOW',
      status: 'OPEN',
    },
  });

  await prisma.supportTicket.create({
    data: {
      userId: customers[2].id,
      orderId: deliveredOrder?.id,
      subject: 'Need GST invoice for my order',
      category: 'OTHER',
      priority: 'LOW',
      status: 'CLOSED',
      assignedTo: adminId,
      resolvedAt: hoursAgo(30),
    },
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('Seeding PostgreSQL…');
  await wipe();

  const admin = await seedAdmin();
  const customers = await seedCustomers();
  const sellers = await seedSellers(admin.id);
  const deliveryBoys = await seedDeliveryBoys();
  const orders = await seedOrders(customers, sellers);
  await seedDeliveries(orders, deliveryBoys);
  await seedReviews(orders, deliveryBoys, sellers);
  await seedCoupons();
  await seedSupportTickets(customers, orders, admin.id);

  console.log('✔ PostgreSQL seed complete:');
  console.log(`   admins=1 customers=${customers.length} sellers=${sellers.length} deliveryBoys=${deliveryBoys.length} orders=${orders.length}`);
}

main()
  .catch((error: unknown) => {
    console.error('PostgreSQL seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
