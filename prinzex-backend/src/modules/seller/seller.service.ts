import type { Prisma, Seller, SellerService } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { OrderTimelineModel } from '../../models/mongo/Order.model';
import type { DeliveryAddressSnapshot, OrderItemSpecifications, OrderStatus } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { emitNotificationNew, emitOrderStatusChanged } from '../../realtime/realtime.emitters';
import { getCache, setCache, invalidateCache, invalidateCachePattern } from '../../utils/cache';
import { sendTeamInviteEmail } from '../../utils/email';
import { autoAssignDelivery } from '../delivery/delivery.assignment';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
  type PaginationParams,
} from '../../utils/pagination';
import type {
  AnalyticsPeriod,
  BulkDiscountsInput,
  BulkPricingInput,
  CreateInventoryInput,
  CreateServiceInput,
  CreateTeamMemberInput,
  DeliverySettingsInput,
  HoursSettingsInput,
  InventoryQuery,
  OrdersQuery,
  RejectOrderInput,
  UpdateInventoryInput,
  UpdateOrderStatusInput,
  UpdateServiceInput,
  UpdateStoreInput,
  UpdateTeamMemberInput,
  WeekDay,
} from './seller.schema';

/**
 * Seller store management — services, pricing, inventory, team, analytics,
 * order queue, payouts and settings. Every function is scoped by the
 * sellerId taken from the authenticated JWT (never from the request).
 */

// ── Shared shapes & pure helpers ───────────────────────────────────────────

export interface BulkDiscountTier {
  minQty: number;
  discountPct: number;
}

export interface StoreHoursEntry {
  day: WeekDay;
  open: string;
  close: string;
  closed: boolean;
}

/** Seller-defined configuration blob persisted in `Seller.metadata`. */
export interface SellerMetadata {
  bulkDiscountTiers?: BulkDiscountTier[];
  hours?: StoreHoursEntry[];
  notifications?: Record<string, boolean>;
  pricingOverrides?: {
    /** Seller-wide per-page rates, common across all page services. */
    pageRate?: {
      bw: number; // ₹ per B&W page
      color: number; // ₹ per colour page
    };
    /** Document Printing colour modes shown to customers. */
    documentColorModes?: {
      bw: boolean;
      color: boolean;
    };
    /** Document Printing stapling choices the seller offers, option value →
     *  ₹ per set. 'loose' is the mandatory free default and is never priced
     *  here; a missing map means the platform default prices apply. */
    staplingOptions?: Record<string, number>;
    // Binding services: additive ₹ components set by the seller.
    // Binding (₹/binding): coverType + coilType + coverColor.
    coverType?: Record<string, number>;
    coilType?: Record<string, number>;
    coverColor?: Record<string, number>;
    /** Hard Binding menus are availability-only; no automatic surcharge. */
    hardCoverColors?: string[];
    hardFoilColors?: string[];
    /** Tape Binding tape colours offered — availability-only, no surcharge. */
    tapeColors?: string[];
    /** Per-service paper availability and additive prices, keyed by catalogue serviceId. */
    servicePaperOptions?: Record<
      string,
      {
        paperTypes?: Record<string, number>;
        paperSizes?: Record<string, number>;
      }
    >;
    twinLoopOptions?: {
      wireColors?: Record<string, number>;
      frontCovers?: Record<string, number>;
      backCovers?: Record<string, number>;
      hangerPrice?: number;
      concealedPrice?: number;
    };
    /** Quantity slab pricing per service (Business Cards): [{ qty, rate }]
     *  meaning "from qty pieces, each piece costs ₹rate". The per-piece rate
     *  falls as quantity grows; the service's slab price replaces its base
     *  price when the customer orders. */
    quantitySlabs?: Record<string, { qty: number; rate: number }[]>;
  };
}

export function readSellerMetadata(json: Prisma.JsonValue | null): SellerMetadata {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return {};
  }
  return json as unknown as SellerMetadata;
}

/** Keep Document Printing's base price and the seller-wide B&W page rate identical. */
function metadataWithDocumentBwRate(json: Prisma.JsonValue | null, bw: number): SellerMetadata {
  const metadata = readSellerMetadata(json);
  return {
    ...metadata,
    pricingOverrides: {
      ...metadata.pricingOverrides,
      pageRate: {
        bw,
        color: metadata.pricingOverrides?.pageRate?.color ?? bw * 2,
      },
    },
  };
}

/** "50100234567890" → "********7890" */
export function maskAccountNumber(accountNumber: string): string {
  const tail = accountNumber.slice(-4);
  return `${'*'.repeat(Math.max(accountNumber.length - 4, 4))}${tail}`;
}

/** "+919876543210" → "+91 ****3210"; "9876543210" → "******3210" */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return phone;
  const tail = phone.slice(-4);
  const country = phone.startsWith('+') ? phone.slice(0, 3) : '';
  return `${country}${country ? ' ' : ''}${'*'.repeat(phone.length - country.length - 4)}${tail}`;
}

/** Privacy: reveal only the customer's first name in list payloads. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}

// ── Order status state machine ─────────────────────────────────────────────
// Seller-manageable slice of the lifecycle. Delivery statuses
// (out_for_delivery/delivered) are owned by the delivery actor; cancelled /
// returned are terminal for seller actions.

export const ORDER_FLOW = ['placed', 'confirmed', 'processing', 'ready_for_pickup'] as const;

/** Statuses that count as "in flight" — block hard-deleting their services. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
];

/** Next status in the seller flow, or null when the seller is done. */
export function expectedNextStatus(current: string): (typeof ORDER_FLOW)[number] | null {
  const index = ORDER_FLOW.indexOf(current as (typeof ORDER_FLOW)[number]);
  if (index < 0) return null;
  return index < ORDER_FLOW.length - 1 ? ORDER_FLOW[index + 1] : null;
}

/**
 * Enforce the state machine: strictly one step forward along
 * placed → confirmed → processing → ready_for_pickup.
 * Skipping steps or moving backwards returns 400.
 */
export function assertForwardTransition(current: string, next: string): void {
  if (current === 'cancelled' || current === 'returned') {
    throw ApiError.badRequest(`Order is ${current} — its status can no longer be changed`);
  }

  const currentIndex = ORDER_FLOW.indexOf(current as (typeof ORDER_FLOW)[number]);
  const nextIndex = ORDER_FLOW.indexOf(next as (typeof ORDER_FLOW)[number]);

  if (currentIndex < 0) {
    throw ApiError.badRequest(
      `Order is already "${current}" — beyond the seller-manageable stage (delivery takes over)`,
    );
  }
  if (nextIndex >= 0 && nextIndex < currentIndex) {
    throw ApiError.badRequest(`Cannot move an order backwards ("${current}" → "${next}")`);
  }
  const expected = expectedNextStatus(current);
  if (expected === null) {
    throw ApiError.badRequest(
      `Order is already at the final seller stage ("${current}") — delivery takes over from here`,
    );
  }
  if (nextIndex === currentIndex) {
    throw ApiError.badRequest(`Order is already "${current}"`);
  }
  if (next !== expected) {
    throw ApiError.badRequest(
      `Invalid status transition "${current}" → "${next}" — next allowed: "${expected}"`,
    );
  }
}

// ── Cache invalidation (shared) ────────────────────────────────────────────

/** Store mutation → drop its detail cache + every store-list page. */
export async function invalidateStoreCaches(sellerId: string): Promise<void> {
  await Promise.all([
    invalidateCache(REDIS_KEYS.STORE_DETAIL(sellerId)),
    invalidateCachePattern(REDIS_KEYS.STORE_LIST_PATTERN()),
  ]);
}

/** New/completed order activity → drop ALL cached analytics periods. */
export async function invalidateSellerAnalytics(sellerId: string): Promise<void> {
  await invalidateCachePattern(REDIS_KEYS.SELLER_ANALYTICS(sellerId, '*'));
}

// ── Store profile ──────────────────────────────────────────────────────────

export interface StoreDocumentInfo {
  id: string;
  docType: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  uploadedAt: Date;
}

export interface StoreBankInfo {
  accountHolderName: string;
  /** Never the full number — masked to the last 4 digits. */
  accountNumberMasked: string;
  ifscCode: string;
  panNumber: string;
  isVerified: boolean;
}

export interface StoreInfo {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstNumber: string | null;
  businessType: string;
  storeAddress: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  openingTime: string;
  closingTime: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  status: string;
  isVerified: boolean;
  rejectionReason: string | null;
  commissionRate: number;
  deliveryRadius: number;
  averageRating: number;
  totalOrders: number;
  completionRate: number;
  onTimeRate: number;
  metadata: SellerMetadata;
  createdAt: Date;
  updatedAt: Date;
  services: SellerService[];
  documents: StoreDocumentInfo[];
  bankDetails: StoreBankInfo | null;
  pincodes: Array<{ pincode: string; isExcluded: boolean }>;
}

async function findSellerOrThrow(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: { services: true, documents: true, bankDetails: true, pincodes: true },
  });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }
  return seller;
}

function toStoreInfo(
  seller: Seller & {
    services: SellerService[];
    pincodes: Array<{ pincode: string; isExcluded: boolean }>;
    documents: Array<{
      id: string;
      docType: string;
      isVerified: boolean;
      verifiedAt: Date | null;
      createdAt: Date;
      fileUrl: string;
    }>;
    bankDetails: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      panNumber: string;
      isVerified: boolean;
    } | null;
  },
): StoreInfo {
  return {
    id: seller.id,
    storeName: seller.storeName,
    ownerName: seller.ownerName,
    email: seller.email,
    phone: seller.phone,
    gstNumber: seller.gstNumber,
    businessType: seller.businessType,
    storeAddress: seller.storeAddress,
    city: seller.city,
    state: seller.state,
    pincode: seller.pincode,
    lat: seller.lat,
    lng: seller.lng,
    openingTime: seller.openingTime,
    closingTime: seller.closingTime,
    logoUrl: seller.logoUrl,
    bannerUrl: seller.bannerUrl,
    description: seller.description,
    status: seller.status,
    isVerified: seller.isVerified,
    rejectionReason: seller.rejectionReason,
    commissionRate: Number(seller.commissionRate),
    deliveryRadius: seller.deliveryRadius,
    averageRating: Number(seller.averageRating),
    totalOrders: seller.totalOrders,
    completionRate: Number(seller.completionRate),
    onTimeRate: Number(seller.onTimeRate),
    metadata: readSellerMetadata(seller.metadata),
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
    services: seller.services,
    pincodes: seller.pincodes,
    documents: seller.documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      isVerified: doc.isVerified,
      verifiedAt: doc.verifiedAt,
      uploadedAt: doc.createdAt,
      // NOTE: fileUrl deliberately withheld in this response.
    })),
    bankDetails: seller.bankDetails
      ? {
          accountHolderName: seller.bankDetails.accountHolderName,
          accountNumberMasked: maskAccountNumber(seller.bankDetails.accountNumber),
          ifscCode: seller.bankDetails.ifscCode,
          panNumber: seller.bankDetails.panNumber,
          isVerified: seller.bankDetails.isVerified,
        }
      : null,
  };
}

export async function getStore(sellerId: string): Promise<StoreInfo> {
  return toStoreInfo(await findSellerOrThrow(sellerId));
}

export async function updateStore(sellerId: string, input: UpdateStoreInput): Promise<StoreInfo> {
  await findSellerOrThrow(sellerId);

  const data: Prisma.SellerUpdateInput = {};
  if (input.storeName !== undefined) data.storeName = input.storeName;
  if (input.ownerName !== undefined) data.ownerName = input.ownerName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.businessType !== undefined) data.businessType = input.businessType;
  if (input.gstNumber !== undefined) data.gstNumber = input.gstNumber;
  if (input.description !== undefined) data.description = input.description;
  if (input.storeAddress !== undefined) data.storeAddress = input.storeAddress;
  if (input.city !== undefined) data.city = input.city;
  if (input.state !== undefined) data.state = input.state;
  if (input.pincode !== undefined) data.pincode = input.pincode;
  if (input.openingTime !== undefined) data.openingTime = input.openingTime;
  if (input.closingTime !== undefined) data.closingTime = input.closingTime;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;

  await prisma.seller.update({ where: { id: sellerId }, data });
  await invalidateStoreCaches(sellerId);

  return getStore(sellerId);
}

// ── Services ───────────────────────────────────────────────────────────────

export interface ServiceGroup {
  categoryId: string;
  categoryName: string;
  services: SellerService[];
}

export function groupServicesByCategory(services: SellerService[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const service of services) {
    const key = service.categoryId;
    const group = groups.get(key) ?? {
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      services: [],
    };
    group.services.push(service);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export async function listServices(sellerId: string): Promise<ServiceGroup[]> {
  const services = await prisma.sellerService.findMany({
    where: { sellerId },
    orderBy: [{ categoryName: 'asc' }, { createdAt: 'asc' }],
  });
  return groupServicesByCategory(services);
}

export async function createService(
  sellerId: string,
  input: CreateServiceInput,
): Promise<SellerService> {
  const duplicate = await prisma.sellerService.findUnique({
    where: { sellerId_serviceId: { sellerId, serviceId: input.serviceId } },
  });
  if (duplicate) {
    throw ApiError.conflict(`Service "${input.serviceId}" is already added to your store`);
  }

  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.sellerService.create({
      data: { sellerId, ...input },
    });

    if (input.serviceId === 'doc-print') {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        select: { metadata: true },
      });
      await tx.seller.update({
        where: { id: sellerId },
        data: {
          metadata: metadataWithDocumentBwRate(
            seller?.metadata ?? null,
            input.basePrice,
          ) as Prisma.InputJsonValue,
        },
      });
    }

    return created;
  });
  await invalidateStoreCaches(sellerId);
  return service;
}

async function findOwnedServiceOrThrow(
  sellerId: string,
  serviceId: string,
): Promise<SellerService> {
  // The id is the row PK; ownership is enforced by the scoping check (404,
  // never 403 — don't confirm the row exists for other sellers).
  const service = await prisma.sellerService.findFirst({
    where: { id: serviceId, sellerId },
  });
  if (!service) {
    throw ApiError.notFound('Service not found');
  }
  return service;
}

export async function updateService(
  sellerId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<SellerService> {
  const existing = await findOwnedServiceOrThrow(sellerId, serviceId);

  const data: Prisma.SellerServiceUpdateInput = {};
  if (input.basePrice !== undefined) data.basePrice = input.basePrice;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.minQuantity !== undefined) data.minQuantity = input.minQuantity;
  if (input.minPages !== undefined) data.minPages = input.minPages;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const service = await prisma.$transaction(async (tx) => {
    const updated = await tx.sellerService.update({ where: { id: serviceId }, data });

    if (existing.serviceId === 'doc-print' && input.basePrice !== undefined) {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        select: { metadata: true },
      });
      await tx.seller.update({
        where: { id: sellerId },
        data: {
          metadata: metadataWithDocumentBwRate(
            seller?.metadata ?? null,
            input.basePrice,
          ) as Prisma.InputJsonValue,
        },
      });
    }

    return updated;
  });
  await invalidateStoreCaches(sellerId);
  return service;
}

export async function deleteService(
  sellerId: string,
  serviceId: string,
): Promise<{ serviceId: string; action: 'deleted' | 'deactivated' }> {
  await findOwnedServiceOrThrow(sellerId, serviceId);

  // Orders still in flight that reference this service block a hard delete.
  const activeUsage = await prisma.orderItem.findFirst({
    where: {
      sellerServiceId: serviceId,
      order: { status: { in: ACTIVE_ORDER_STATUSES } },
    },
    select: { id: true },
  });

  if (activeUsage) {
    // Soft delete — historical/active orders keep referring to the row.
    await prisma.sellerService.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
    await invalidateStoreCaches(sellerId);
    return { serviceId, action: 'deactivated' };
  }

  await prisma.sellerService.delete({ where: { id: serviceId } });
  await invalidateStoreCaches(sellerId);
  return { serviceId, action: 'deleted' };
}

// ── Pricing ────────────────────────────────────────────────────────────────

export interface PricingInfo {
  services: SellerService[];
  bulkDiscountTiers: BulkDiscountTier[];
  pricingOverrides: SellerMetadata['pricingOverrides'];
}

export async function getPricing(sellerId: string): Promise<PricingInfo> {
  const [services, seller] = await Promise.all([
    prisma.sellerService.findMany({
      where: { sellerId, isActive: true },
      orderBy: { serviceName: 'asc' },
    }),
    prisma.seller.findUnique({ where: { id: sellerId }, select: { metadata: true } }),
  ]);
  const metadata = readSellerMetadata(seller?.metadata ?? null);
  return {
    services,
    bulkDiscountTiers: metadata.bulkDiscountTiers ?? [],
    pricingOverrides: metadata.pricingOverrides ?? {},
  };
}

export async function bulkUpdatePrices(
  sellerId: string,
  input: BulkPricingInput,
): Promise<{ updated: number }> {
  const ids = input.map((entry) => entry.serviceId);
  const owned = await prisma.sellerService.findMany({
    where: { sellerId, id: { in: ids } },
    select: { id: true, serviceId: true },
  });
  const ownedIds = new Set(owned.map((service) => service.id));
  const missing = ids.filter((id) => !ownedIds.has(id));
  if (missing.length > 0) {
    throw ApiError.notFound(`Services not found: ${missing.join(', ')}`);
  }

  const documentService = owned.find((service) => service.serviceId === 'doc-print');
  const documentPrice = documentService
    ? input.find((entry) => entry.serviceId === documentService.id)?.basePrice
    : undefined;

  // One transaction — every service price and the matching B&W rate update or none do.
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      input.map((entry) =>
        tx.sellerService.update({
          where: { id: entry.serviceId },
          data: {
            basePrice: entry.basePrice,
            unit: entry.unit,
            ...(entry.minQuantity !== undefined ? { minQuantity: entry.minQuantity } : {}),
            ...(entry.minPages !== undefined ? { minPages: entry.minPages } : {}),
          },
        }),
      ),
    );

    if (documentPrice !== undefined) {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        select: { metadata: true },
      });
      await tx.seller.update({
        where: { id: sellerId },
        data: {
          metadata: metadataWithDocumentBwRate(
            seller?.metadata ?? null,
            documentPrice,
          ) as Prisma.InputJsonValue,
        },
      });
    }
  });
  await invalidateStoreCaches(sellerId);
  return { updated: input.length };
}

export async function updateBulkDiscountTiers(
  sellerId: string,
  input: BulkDiscountsInput,
): Promise<{ bulkDiscountTiers: BulkDiscountTier[] }> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { metadata: true },
  });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }

  // Merge into existing metadata (hours live there too) — never overwrite.
  const tiers = [...input.tiers].sort((a, b) => a.minQty - b.minQty);
  const metadata: SellerMetadata = {
    ...readSellerMetadata(seller.metadata),
    bulkDiscountTiers: tiers,
  };
  await prisma.seller.update({
    where: { id: sellerId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
  await invalidateStoreCaches(sellerId);

  return { bulkDiscountTiers: tiers };
}

// ── Inventory ──────────────────────────────────────────────────────────────

export async function listInventory(sellerId: string, query: InventoryQuery) {
  // Prisma can't compare two columns (currentStock <= lowStockThreshold)
  // without the fieldReference preview, so low-stock filtering runs in the
  // app layer over this seller's bounded item set.
  const items = await prisma.sellerInventory.findMany({
    where: { sellerId },
    orderBy: { updatedAt: 'desc' },
  });
  if (query.lowStockOnly === 'true') {
    return items.filter((item) => item.currentStock <= item.lowStockThreshold);
  }
  return items;
}

export async function createInventoryItem(sellerId: string, input: CreateInventoryInput) {
  return prisma.sellerInventory.create({
    data: {
      sellerId,
      name: input.name,
      category: input.category,
      currentStock: input.currentStock,
      unit: input.unit,
      lowStockThreshold: input.lowStockThreshold,
      lastRestocked: new Date(),
    },
  });
}

async function findOwnedInventoryItemOrThrow(sellerId: string, itemId: string) {
  const item = await prisma.sellerInventory.findFirst({ where: { id: itemId, sellerId } });
  if (!item) {
    throw ApiError.notFound('Inventory item not found');
  }
  return item;
}

export async function updateInventoryItem(
  sellerId: string,
  itemId: string,
  input: UpdateInventoryInput,
) {
  const item = await findOwnedInventoryItemOrThrow(sellerId, itemId);

  const data: Prisma.SellerInventoryUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.category !== undefined) data.category = input.category;
  if (input.currentStock !== undefined) data.currentStock = input.currentStock;
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;

  // A stock increase means the shelf was refilled.
  if (input.currentStock !== undefined && input.currentStock > item.currentStock) {
    data.lastRestocked = new Date();
  }

  return prisma.sellerInventory.update({ where: { id: itemId }, data });
}

export async function deleteInventoryItem(
  sellerId: string,
  itemId: string,
): Promise<{ deleted: true }> {
  await findOwnedInventoryItemOrThrow(sellerId, itemId);
  await prisma.sellerInventory.delete({ where: { id: itemId } });
  return { deleted: true };
}

export interface LowStockAlertResult {
  count: number;
  items: Array<{
    id: string;
    name: string;
    currentStock: number;
    lowStockThreshold: number;
    unit: string;
  }>;
}

export async function getLowStockAlerts(sellerId: string): Promise<LowStockAlertResult> {
  const all = await prisma.sellerInventory.findMany({ where: { sellerId } });
  const low = all.filter((item) => item.currentStock <= item.lowStockThreshold);

  // The alert itself is a notification — persisted to MongoDB when actionable.
  if (low.length > 0) {
    await NotificationModel.create({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'low_stock',
      title: 'Low stock alert',
      body: `${low.length} item(s) at or below the low-stock threshold.`,
      data: { itemIds: low.map((item) => item.id) },
      channel: ['push'],
    });
  }

  return {
    count: low.length,
    items: low.map((item) => ({
      id: item.id,
      name: item.name,
      currentStock: item.currentStock,
      lowStockThreshold: item.lowStockThreshold,
      unit: item.unit,
    })),
  };
}

// ── Team ───────────────────────────────────────────────────────────────────

export async function listTeamMembers(sellerId: string) {
  return prisma.sellerTeamMember.findMany({
    where: { sellerId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addTeamMember(sellerId: string, input: CreateTeamMemberInput) {
  const existing = await prisma.sellerTeamMember.findFirst({
    where: { sellerId, email: input.email },
  });
  if (existing) {
    throw ApiError.conflict('A team member with this email already exists');
  }

  const member = await prisma.sellerTeamMember.create({
    data: { sellerId, ...input },
  });

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { storeName: true },
  });
  await sendTeamInviteEmail(input.email, input.name, seller?.storeName ?? 'your store', input.role);

  return member;
}

async function findOwnedTeamMemberOrThrow(sellerId: string, memberId: string) {
  const member = await prisma.sellerTeamMember.findFirst({ where: { id: memberId, sellerId } });
  if (!member) {
    throw ApiError.notFound('Team member not found');
  }
  return member;
}

export async function updateTeamMember(
  sellerId: string,
  memberId: string,
  input: UpdateTeamMemberInput,
) {
  await findOwnedTeamMemberOrThrow(sellerId, memberId);

  const data: Prisma.SellerTeamMemberUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.sellerTeamMember.update({ where: { id: memberId }, data });
}

export async function deleteTeamMember(
  sellerId: string,
  memberId: string,
): Promise<{ deleted: true }> {
  await findOwnedTeamMemberOrThrow(sellerId, memberId);
  await prisma.sellerTeamMember.delete({ where: { id: memberId } });
  return { deleted: true };
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface PeriodRange {
  /** Inclusive */
  start: Date;
  /** Exclusive */
  end: Date;
}

export function resolvePeriod(period: AnalyticsPeriod, now = new Date()): PeriodRange {
  const DAY_MS = 24 * 60 * 60 * 1000;
  switch (period) {
    case '7d':
      return { start: new Date(now.getTime() - 7 * DAY_MS), end: now };
    case '30d':
      return { start: new Date(now.getTime() - 30 * DAY_MS), end: now };
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1),
      };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  start: Date;
  end: Date;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  /** Delivered / total non-cancelled, percentage 0–100. */
  completionRate: number;
  /** Delivered on or before estimatedDelivery / total delivered, 0–100. */
  onTimeRate: number;
}

interface AnalyticsOrderRow {
  total: Prisma.Decimal | number | string;
  status: string;
  createdAt: Date;
  estimatedDelivery: Date;
  delivery: { deliveredAt: Date | null } | null;
}

export function computeOverview(
  orders: AnalyticsOrderRow[],
  period: AnalyticsPeriod,
  range: PeriodRange,
): AnalyticsOverview {
  const totalOrders = orders.length;
  const totalRevenue = round2(orders.reduce((sum, order) => sum + Number(order.total), 0));
  const delivered = orders.filter((order) => order.status === 'delivered');
  const onTime = delivered.filter(
    (order) =>
      order.delivery?.deliveredAt != null && order.delivery.deliveredAt <= order.estimatedDelivery,
  );

  return {
    period,
    start: range.start,
    end: range.end,
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? round2(totalRevenue / totalOrders) : 0,
    completionRate: totalOrders > 0 ? round2((delivered.length / totalOrders) * 100) : 0,
    onTimeRate: delivered.length > 0 ? round2((onTime.length / delivered.length) * 100) : 0,
  };
}

export interface CachedOverview {
  overview: AnalyticsOverview;
  cacheHit: boolean;
}

export async function getAnalyticsOverview(
  sellerId: string,
  period: AnalyticsPeriod,
): Promise<CachedOverview> {
  const cacheKey = REDIS_KEYS.SELLER_ANALYTICS(sellerId, period);
  const cached = await getCache<AnalyticsOverview>(cacheKey);
  if (cached) {
    return { overview: cached, cacheHit: true };
  }

  const range = resolvePeriod(period);
  const orders = await prisma.order.findMany({
    where: {
      sellerId,
      status: { not: 'cancelled' },
      createdAt: { gte: range.start, lt: range.end },
    },
    select: {
      total: true,
      status: true,
      createdAt: true,
      estimatedDelivery: true,
      delivery: { select: { deliveredAt: true } },
    },
  });

  const overview = computeOverview(orders, period, range);
  await setCache(cacheKey, overview, REDIS_TTL.CACHE_ANALYTICS);
  return { overview, cacheHit: false };
}

// ── Revenue by day ─────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string; // YYYY-MM-DD (local)
  revenue: number;
  orders: number;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Every calendar date touched by the range (day of `end` excluded). */
export function periodDays(range: PeriodRange): string[] {
  const days: string[] = [];
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(range.end.getTime() - 1);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function bucketRevenueByDay(
  orders: Array<{ total: Prisma.Decimal | number | string; createdAt: Date }>,
  range: PeriodRange,
): DailyRevenue[] {
  const buckets = new Map<string, DailyRevenue>(
    periodDays(range).map((date) => [date, { date, revenue: 0, orders: 0 }]),
  );
  for (const order of orders) {
    const key = localDateKey(order.createdAt);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { date: key, revenue: 0, orders: 0 };
      buckets.set(key, bucket);
    }
    bucket.revenue = round2(bucket.revenue + Number(order.total));
    bucket.orders += 1;
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRevenueByDay(
  sellerId: string,
  period: AnalyticsPeriod,
): Promise<DailyRevenue[]> {
  const range = resolvePeriod(period);
  const orders = await prisma.order.findMany({
    where: {
      sellerId,
      status: { not: 'cancelled' },
      createdAt: { gte: range.start, lt: range.end },
    },
    select: { total: true, createdAt: true },
  });
  return bucketRevenueByDay(orders, range);
}

// ── Service breakdown ──────────────────────────────────────────────────────

export interface ServiceBreakdownEntry {
  serviceName: string;
  revenue: number;
  orders: number;
}

export async function getServiceBreakdown(sellerId: string): Promise<ServiceBreakdownEntry[]> {
  // "Completed" = delivered. Revenue is the per-line total (not order total)
  // so a multi-service order attributes earnings to the right service.
  const grouped = await prisma.orderItem.groupBy({
    by: ['serviceName'],
    where: { order: { sellerId, status: 'delivered' } },
    _sum: { total: true },
    _count: { orderId: true },
  });

  return grouped
    .map((row) => ({
      serviceName: row.serviceName,
      revenue: round2(Number(row._sum.total ?? 0)),
      orders: row._count.orderId,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Orders queue ───────────────────────────────────────────────────────────

export interface SellerOrderListItem {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  rushFee: number;
  tax: number;
  discount: number;
  isRush: boolean;
  deliverySpeed: string;
  paymentStatus: string;
  paymentMethod: string;
  estimatedDelivery: Date;
  createdAt: Date;
  customerName: string; // first name only
  services: string[];
  specsSummary: string;
  serviceName: string;
  quantity: number;
  specialInstructions: string | null;
}

export function summarizeSpecifications(specs: Prisma.JsonValue): string {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
    return '';
  }
  return Object.entries(specs as OrderItemSpecifications)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

export async function listOrders(
  sellerId: string,
  query: OrdersQuery,
): Promise<PaginatedResponse<SellerOrderListItem>> {
  const where: Prisma.OrderWhereInput = {
    sellerId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.isRush !== undefined ? { isRush: query.isRush } : {}),
  };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        customer: { select: { name: true } },
        items: { select: { serviceName: true, quantity: true, specifications: true } },
      },
    }),
  ]);

  const data: SellerOrderListItem[] = orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    rushFee: Number(order.rushFee),
    tax: Number(order.tax),
    discount: Number(order.discount),
    isRush: order.isRush,
    deliverySpeed: order.deliverySpeed,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    estimatedDelivery: order.estimatedDelivery,
    createdAt: order.createdAt,
    customerName: firstName(order.customer.name),
    services: order.items.map((item) => `${item.serviceName} ×${item.quantity}`),
    specsSummary: summarizeSpecifications(order.items[0]?.specifications ?? null),
    serviceName: order.items[0]?.serviceName ?? 'Document Printing',
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    specialInstructions: order.specialInstructions,
  }));

  return buildPaginatedResponse(data, total, { page: query.page, limit: query.limit });
}

export interface SellerOrderDetail {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  rushFee: number;
  tax: number;
  discount: number;
  commissionAmount: number;
  isRush: boolean;
  deliverySpeed: string;
  paymentStatus: string;
  paymentMethod: string;
  couponCode: string | null;
  specialInstructions: string | null;
  estimatedDelivery: Date;
  cancelReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  deliveryAddress: DeliveryAddressSnapshot | null;
  customer: { name: string; maskedPhone: string | null };
  items: Array<{
    id: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    specifications: Prisma.JsonValue;
    fileUrl: string | null;
  }>;
  timeline: Array<{
    status: string;
    label?: string;
    timestamp: Date;
    note?: string;
    updatedBy: string;
  }>;
}

async function findOwnedOrderOrThrow(sellerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId },
    include: { customer: { select: { name: true, phone: true } }, items: true },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  return order;
}

export async function getOrderDetail(
  sellerId: string,
  orderId: string,
): Promise<SellerOrderDetail> {
  const order = await findOwnedOrderOrThrow(sellerId, orderId);
  const mongoDoc = await OrderTimelineModel.findOne({ orderId: order.id });

  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    rushFee: Number(order.rushFee),
    tax: Number(order.tax),
    discount: Number(order.discount),
    commissionAmount: Number(order.commissionAmount),
    isRush: order.isRush,
    deliverySpeed: order.deliverySpeed,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode,
    specialInstructions: order.specialInstructions,
    estimatedDelivery: order.estimatedDelivery,
    cancelReason: order.cancelReason,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    deliveryAddress: order.deliveryAddress as DeliveryAddressSnapshot | null,
    customer: { name: order.customer.name, maskedPhone: maskPhone(order.customer.phone) },
    items: order.items.map((item) => ({
      id: item.id,
      serviceName: item.serviceName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      specifications: item.specifications,
      fileUrl: item.fileUrl,
    })),
    timeline: (mongoDoc?.timeline ?? []).map((event) => ({
      status: event.status,
      ...(event.label !== undefined ? { label: event.label } : {}),
      timestamp: event.timestamp,
      ...(event.note !== undefined ? { note: event.note } : {}),
      updatedBy: event.updatedBy,
    })),
  };
}

// ── Order status updates & rejection ───────────────────────────────────────

function humanizeStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

async function appendTimelineEvent(
  orderId: string,
  status: string,
  updatedBy: string,
  note?: string,
): Promise<void> {
  await OrderTimelineModel.updateOne(
    { orderId },
    {
      $push: {
        timeline: {
          status,
          label: humanizeStatus(status),
          timestamp: new Date(),
          ...(note ? { note } : {}),
          updatedBy,
        },
      },
    },
    { upsert: true },
  );
}

async function notifyCustomerOrderUpdate(
  customerId: string,
  orderId: string,
  status: string,
  note?: string,
): Promise<void> {
  const title = `Order ${orderId.slice(-6).toUpperCase()} — ${humanizeStatus(status)}`;
  const body = note ?? `Your order status is now "${humanizeStatus(status)}".`;
  await NotificationModel.create({
    recipientId: customerId,
    recipientType: 'customer',
    type: 'order_update',
    title,
    body,
    data: { orderId, status },
    channel: ['push'],
  });
  emitNotificationNew('customer', customerId, {
    type: 'order_update',
    title,
    body,
    data: { orderId, status },
  }); // step 9
}

export async function updateOrderStatus(
  sellerId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
): Promise<{ orderId: string; status: string }> {
  const order = await findOwnedOrderOrThrow(sellerId, orderId);
  assertForwardTransition(order.status, input.status);

  await prisma.order.update({
    where: { id: order.id },
    data: { status: input.status },
  });

  await appendTimelineEvent(order.id, input.status, sellerId, input.note);
  await notifyCustomerOrderUpdate(order.customerId, order.id, input.status, input.note);
  emitOrderStatusChanged(order, input.status); // step 9 realtime (post-commit, safe no-op when sockets are down)
  await invalidateSellerAnalytics(sellerId);

  // ready_for_pickup kicks off rider assignment (step 6 engine). Failure here
  // must not fail the status update — the retry cron (TODO) will re-attempt.
  if (input.status === 'ready_for_pickup') {
    try {
      await autoAssignDelivery(order.id);
    } catch (error) {
      logger.error('auto_assignment_trigger_failed', {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { orderId: order.id, status: input.status };
}

export async function rejectOrder(
  sellerId: string,
  orderId: string,
  input: RejectOrderInput,
): Promise<{ orderId: string; status: string }> {
  const order = await findOwnedOrderOrThrow(sellerId, orderId);
  if (order.status !== 'placed') {
    throw ApiError.badRequest(
      `Only new ("placed") orders can be rejected — this order is "${order.status}"`,
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'cancelled', cancelReason: input.reason, cancelledAt: new Date() },
  });

  // TODO(payments step): if order.paymentStatus === 'paid', trigger a
  // Razorpay refund for order.paymentId and mark paymentStatus 'refunded'.

  await appendTimelineEvent(order.id, 'cancelled', sellerId, `Rejected by store: ${input.reason}`);
  await notifyCustomerOrderUpdate(
    order.customerId,
    order.id,
    'cancelled',
    `Your order was rejected by the store: ${input.reason}`,
  );
  await invalidateSellerAnalytics(sellerId);

  return { orderId: order.id, status: 'cancelled' };
}

// ── Payouts ────────────────────────────────────────────────────────────────

export interface PendingBalance {
  balance: number;
  ordersIncluded: number;
  minThreshold: number;
  canRequest: boolean;
  blockedByPayoutId: string | null;
}

/** Net seller earnings per order: total minus platform commission and delivery fee. */
export function netOrderEarnings(order: {
  total: Prisma.Decimal | number | string;
  commissionAmount: Prisma.Decimal | number | string;
  deliveryFee: Prisma.Decimal | number | string;
}): number {
  return Number(order.total) - Number(order.commissionAmount) - Number(order.deliveryFee);
}

export async function getPendingBalance(sellerId: string): Promise<PendingBalance> {
  // Delivered orders not yet locked into a payout = withdrawable earnings.
  const [orders, blocking] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId, status: 'delivered', payoutId: null },
      select: { total: true, commissionAmount: true, deliveryFee: true },
    }),
    prisma.payout.findFirst({
      where: { sellerId, recipientType: 'seller', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    }),
  ]);

  const balance = round2(orders.reduce((sum, order) => sum + netOrderEarnings(order), 0));
  return {
    balance,
    ordersIncluded: orders.length,
    minThreshold: env.MIN_PAYOUT_THRESHOLD,
    canRequest: balance >= env.MIN_PAYOUT_THRESHOLD && blocking === null,
    blockedByPayoutId: blocking?.id ?? null,
  };
}

export async function listPayouts(
  sellerId: string,
  params: PaginationParams,
): Promise<PaginatedResponse<unknown>> {
  const where: Prisma.PayoutWhereInput = { sellerId, recipientType: 'seller' };
  const { skip, take } = toSkipTake(params);
  const [total, payouts] = await prisma.$transaction([
    prisma.payout.count({ where }),
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return buildPaginatedResponse(
    payouts.map((payout) => ({
      id: payout.id,
      status: payout.status,
      amount: Number(payout.amount),
      ordersIncluded: payout.ordersIncluded,
      bankAccount: payout.bankAccount,
      initiatedAt: payout.initiatedAt,
      processedAt: payout.processedAt,
      failReason: payout.failReason,
      createdAt: payout.createdAt,
    })),
    total,
    params,
  );
}

export async function requestPayout(sellerId: string) {
  const bank = await prisma.sellerBankDetails.findUnique({ where: { sellerId } });
  if (!bank) {
    throw ApiError.badRequest('Add your bank details before requesting a payout');
  }
  const maskedAccount = maskAccountNumber(bank.accountNumber);

  const payout = await prisma.$transaction(async (tx) => {
    // Eligibility checks run INSIDE the transaction to close request races.
    const blocking = await tx.payout.findFirst({
      where: { sellerId, recipientType: 'seller', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    });
    if (blocking) {
      throw ApiError.conflict('You already have a payout request in progress');
    }

    const eligible = await tx.order.findMany({
      where: { sellerId, status: 'delivered', payoutId: null },
      select: { id: true, total: true, commissionAmount: true, deliveryFee: true },
    });
    const amount = round2(eligible.reduce((sum, order) => sum + netOrderEarnings(order), 0));

    if (eligible.length === 0) {
      throw ApiError.badRequest('No completed orders are pending payout yet');
    }
    if (amount < env.MIN_PAYOUT_THRESHOLD) {
      throw ApiError.badRequest(
        `Pending balance ₹${amount} is below the minimum payout threshold of ₹${env.MIN_PAYOUT_THRESHOLD}`,
      );
    }

    const created = await tx.payout.create({
      data: {
        recipientType: 'seller',
        sellerId,
        amount,
        ordersIncluded: eligible.length,
        status: 'PENDING',
        bankAccount: maskedAccount,
      },
    });

    // Lock those orders into this payout so a second request can't re-claim.
    await tx.order.updateMany({
      where: { id: { in: eligible.map((order) => order.id) } },
      data: { payoutId: created.id },
    });

    return created;
  });

  return {
    id: payout.id,
    status: payout.status,
    amount: Number(payout.amount),
    ordersIncluded: payout.ordersIncluded,
    bankAccount: payout.bankAccount,
    createdAt: payout.createdAt,
  };
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function updateDeliverySettings(
  sellerId: string,
  input: DeliverySettingsInput,
): Promise<{ deliveryRadius: number; pincodes: Array<{ pincode: string; isExcluded: boolean }> }> {
  await prisma.$transaction(async (tx) => {
    if (input.deliveryRadius !== undefined) {
      await tx.seller.update({
        where: { id: sellerId },
        data: { deliveryRadius: input.deliveryRadius },
      });
    }
    if (input.pincodes !== undefined) {
      // Full replacement per call (delete + recreate).
      await tx.sellerPincode.deleteMany({ where: { sellerId } });
      if (input.pincodes.length > 0) {
        await tx.sellerPincode.createMany({
          data: input.pincodes.map((entry) => ({
            sellerId,
            pincode: entry.pincode,
            isExcluded: entry.isExcluded,
          })),
        });
      }
    }
  });

  const [seller, pincodes] = await Promise.all([
    prisma.seller.findUnique({ where: { id: sellerId }, select: { deliveryRadius: true } }),
    prisma.sellerPincode.findMany({
      where: { sellerId },
      select: { pincode: true, isExcluded: true },
      orderBy: { pincode: 'asc' },
    }),
  ]);

  await invalidateStoreCaches(sellerId);
  return { deliveryRadius: seller?.deliveryRadius ?? 0, pincodes };
}

export async function updateStoreHours(
  sellerId: string,
  input: HoursSettingsInput,
): Promise<{ hours: StoreHoursEntry[] }> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { metadata: true },
  });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }

  // Merge — bulk discount tiers share the same JSON column.
  const metadata: SellerMetadata = {
    ...readSellerMetadata(seller.metadata),
    hours: input.hours,
  };

  // Sync root opening/closing fields with Monday's hours for basic DB filtering/sorting
  const monday = input.hours.find((h) => h.day.toLowerCase() === 'monday');
  const updateData: Prisma.SellerUpdateInput = {
    metadata: metadata as Prisma.InputJsonValue,
  };

  if (monday && !monday.closed) {
    updateData.openingTime = monday.open;
    updateData.closingTime = monday.close;
  }

  await prisma.seller.update({
    where: { id: sellerId },
    data: updateData,
  });
  await invalidateStoreCaches(sellerId);

  return { hours: input.hours };
}

export async function updateNotificationSettings(
  sellerId: string,
  preferences: Record<string, boolean>,
): Promise<Record<string, boolean>> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { metadata: true },
  });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }

  const metadata: SellerMetadata = {
    ...readSellerMetadata(seller.metadata),
    notifications: preferences,
  };
  await prisma.seller.update({
    where: { id: sellerId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });

  return preferences;
}

export async function updatePricingOverrides(
  sellerId: string,
  overrides: SellerMetadata['pricingOverrides'],
): Promise<SellerMetadata['pricingOverrides']> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { metadata: true },
  });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }

  if (
    overrides?.documentColorModes &&
    !overrides.documentColorModes.bw &&
    !overrides.documentColorModes.color
  ) {
    throw ApiError.badRequest('Keep at least one Document Printing colour mode enabled');
  }

  if (overrides?.twinLoopOptions) {
    const twinLoop = overrides.twinLoopOptions;
    if (
      Object.keys(twinLoop.wireColors ?? {}).length === 0 ||
      Object.keys(twinLoop.frontCovers ?? {}).length === 0 ||
      Object.keys(twinLoop.backCovers ?? {}).length === 0
    ) {
      throw ApiError.badRequest(
        'Twin Loop needs at least one wire, front cover, and back cover option',
      );
    }
    if (
      !(twinLoop.frontCovers && 'heavy-cardstock' in twinLoop.frontCovers) ||
      !(twinLoop.backCovers && 'matching-front' in twinLoop.backCovers)
    ) {
      throw ApiError.badRequest(
        'Twin Loop custom artwork requires Heavy Cardstock and Matching Front cover options',
      );
    }
  }

  if (overrides?.tapeColors && overrides.tapeColors.length === 0) {
    throw ApiError.badRequest('Keep at least one Tape Binding colour enabled');
  }

  const bwRate = overrides?.pageRate?.bw;
  if (bwRate !== undefined && (!Number.isFinite(bwRate) || bwRate <= 0)) {
    throw ApiError.badRequest('B&W page price must be greater than 0');
  }

  for (const [option, price] of Object.entries(overrides?.staplingOptions ?? {})) {
    if (option === 'loose' || !Number.isFinite(price) || price < 0) {
      throw ApiError.badRequest(
        'Stapling prices must be numbers at or above 0 — Loose Sheet is always free',
      );
    }
  }

  for (const [serviceId, slabs] of Object.entries(overrides?.quantitySlabs ?? {})) {
    if (!Array.isArray(slabs) || slabs.length === 0) {
      throw ApiError.badRequest(`Quantity slabs for ${serviceId} need at least one entry`);
    }
    for (const slab of slabs) {
      if (
        !Number.isInteger(slab.qty) ||
        slab.qty < 1 ||
        !Number.isFinite(slab.rate) ||
        slab.rate <= 0
      ) {
        throw ApiError.badRequest(
          `Quantity slabs for ${serviceId} need whole quantities and rates above 0`,
        );
      }
    }
  }

  const metadata: SellerMetadata = {
    ...readSellerMetadata(seller.metadata),
    pricingOverrides: overrides,
  };
  await prisma.$transaction(async (tx) => {
    await tx.seller.update({
      where: { id: sellerId },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });

    if (bwRate !== undefined) {
      await tx.sellerService.updateMany({
        where: { sellerId, serviceId: 'doc-print', isActive: true },
        data: { basePrice: bwRate },
      });
    }
  });
  // Customers read cover availability from the (cached) store detail — drop the
  // cache so the storefront reflects the new options immediately.
  await invalidateStoreCaches(sellerId);

  return overrides;
}
