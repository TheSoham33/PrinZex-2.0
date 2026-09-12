import { Types } from 'mongoose';
import { prisma } from '../../../config/database';
import { ContentModel, type IContent } from '../../../models/mongo/Content.model';
import { ApiError } from '../../../utils/ApiError';
import {
  DEFAULT_MAX_UPLOAD_MB,
  MAX_CONFIGURABLE_UPLOAD_MB,
  invalidateUploadLimitCache,
  parseMaxUploadMb,
} from '../../../utils/uploadLimits';
import {
  invalidatePlatformFeeCache,
  parsePlatformFee,
} from '../../../utils/platformFee';
import {
  parseBoundedNumber,
  parseSpeedMapStrict,
  PLATFORM_SETTING_DEFAULTS,
  platformValuesFromMetadata,
  SETTING_BOUNDS,
} from '../../../utils/platformSettings';
import type { BannerCreateBody, BannerUpdateBody, FaqCreateBody, FaqUpdateBody } from './admin-content.routes';

/**
 * Content management (MongoDB Content collection) — banners + FAQs for the
 * storefront. The public router reads the same collection without auth.
 */

export interface BannerDto {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FaqDto {
  id: string;
  title: string;
  body: string;
  category: string;
  order: number;
  isActive: boolean;
}

function toBanner(doc: IContent & { _id: unknown }): BannerDto {
  return {
    id: String(doc._id),
    title: doc.title ?? '',
    imageUrl: doc.imageUrl ?? '',
    linkUrl: doc.linkUrl ?? null,
    isActive: doc.isActive,
    order: doc.order,
    ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
  };
}

function toFaq(doc: IContent & { _id: unknown }): FaqDto {
  return {
    id: String(doc._id),
    title: doc.title ?? '',
    body: doc.body ?? '',
    category: doc.category ?? 'general',
    order: doc.order,
    isActive: doc.isActive,
  };
}

function assertObjectId(id: string, label = 'Content'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.notFound(`${label} not found`);
  }
}

// ── BANNERS ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export async function listBanners(isActive?: boolean): Promise<BannerDto[]> {
  const docs = await ContentModel.find({ type: 'banner', ...(isActive === undefined ? {} : { isActive }) })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return docs.map((doc) => toBanner(doc));
}

export async function createBanner(adminId: string, input: BannerCreateBody): Promise<BannerDto> {
  let order = input.order;
  if (order === undefined) {
    // Default to the end of the list.
    const last = await ContentModel.findOne({ type: 'banner' }).sort({ order: -1 }).lean();
    order = (last?.order ?? -1) + 1;
  }
  const doc = await ContentModel.create({
    type: 'banner',
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl ?? null,
    isActive: input.isActive ?? true,
    order,
    createdBy: adminId,
  });
  return toBanner(doc);
}

export async function updateBanner(adminId: string, id: string, input: BannerUpdateBody): Promise<BannerDto> {
  assertObjectId(id, 'Banner');
  const doc = await ContentModel.findOneAndUpdate(
    { _id: id, type: 'banner' },
    {
      $set: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedBy: adminId,
      },
    },
    { new: true },
  ).lean();
  if (!doc) {
    throw ApiError.notFound('Banner not found');
  }
  return toBanner(doc);
}

export async function deleteBanner(id: string): Promise<{ deleted: boolean }> {
  assertObjectId(id, 'Banner');
  const doc = await ContentModel.findOneAndDelete({ _id: id, type: 'banner' }).lean();
  if (!doc) {
    throw ApiError.notFound('Banner not found');
  }
  return { deleted: true };
}

/** Whole-list reorder in ONE MongoDB bulkWrite (never N individual updates). */
export async function reorderBanners(adminId: string, orderedIds: string[]): Promise<{ reordered: number }> {
  for (const id of orderedIds) {
    assertObjectId(id, 'Banner');
  }
  const result = await ContentModel.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, type: 'banner' },
        update: { $set: { order: index, updatedBy: adminId } },
      },
    })),
  );
  return { reordered: result.modifiedCount };
}

// ── FAQS ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export interface FaqGroup {
  category: string;
  faqs: FaqDto[];
}

export async function listFaqsGrouped(category?: string, activeOnly = false): Promise<FaqGroup[]> {
  const docs = await ContentModel.find({
    type: 'faq',
    ...(category ? { category } : {}),
    ...(activeOnly ? { isActive: true } : {}),
  })
    .sort({ category: 1, order: 1, createdAt: 1 })
    .lean();

  const grouped = new Map<string, FaqDto[]>();
  for (const doc of docs) {
    const faq = toFaq(doc);
    const list = grouped.get(faq.category) ?? [];
    list.push(faq);
    grouped.set(faq.category, list);
  }
  return [...grouped.entries()].map(([name, faqs]) => ({ category: name, faqs }));
}

export async function createFaq(adminId: string, input: FaqCreateBody): Promise<FaqDto> {
  const doc = await ContentModel.create({
    type: 'faq',
    title: input.title,
    body: input.body,
    category: input.category,
    order: input.order ?? 0,
    isActive: true,
    createdBy: adminId,
  });
  return toFaq(doc);
}

export async function updateFaq(adminId: string, id: string, input: FaqUpdateBody): Promise<FaqDto> {
  assertObjectId(id, 'FAQ');
  const doc = await ContentModel.findOneAndUpdate(
    { _id: id, type: 'faq' },
    {
      $set: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedBy: adminId,
      },
    },
    { new: true },
  ).lean();
  if (!doc) {
    throw ApiError.notFound('FAQ not found');
  }
  return toFaq(doc);
}

export async function deleteFaq(id: string): Promise<{ deleted: boolean }> {
  assertObjectId(id, 'FAQ');
  const doc = await ContentModel.findOneAndDelete({ _id: id, type: 'faq' }).lean();
  if (!doc) {
    throw ApiError.notFound('FAQ not found');
  }
  return { deleted: true };
}

// ── CATEGORIES ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  serviceCount: number;
}

export async function listCategories(): Promise<CategoryDto[]> {
  // 1. Get all unique categories and their service counts from PostgreSQL
  const services = await prisma.sellerService.groupBy({
    by: ['categoryId', 'categoryName'],
    _count: { _all: true },
  });

  // 2. Get manual overrides/status from MongoDB
  const overrides = await ContentModel.find({ type: 'category' }).lean();

  return services.map((s) => {
    const override = overrides.find((o) => o.slug === s.categoryId);
    return {
      id: override ? String(override._id) : s.categoryId,
      name: s.categoryName,
      slug: s.categoryId,
      isActive: override ? override.isActive : true,
      serviceCount: s._count._all,
    };
  });
}

export async function updateCategory(adminId: string, id: string, input: { isActive: boolean }): Promise<CategoryDto> {
  // If ID is a cuid (from postgres), we need to create the doc in MongoDB first
  let doc;
  if (Types.ObjectId.isValid(id)) {
    doc = await ContentModel.findByIdAndUpdate(
      id,
      { $set: { isActive: input.isActive, updatedBy: adminId } },
      { new: true, upsert: true }
    ).lean();
  } else {
    // Upsert by slug if it's a raw category ID from Postgres
    doc = await ContentModel.findOneAndUpdate(
      { type: 'category', slug: id },
      { $set: { isActive: input.isActive, type: 'category', slug: id, updatedBy: adminId } },
      { new: true, upsert: true }
    ).lean();
  }

  const fresh = await listCategories();
  const item = fresh.find(c => c.slug === (doc?.slug || id));
  if (!item) throw ApiError.notFound('Category not found');
  return item;
}

// ── TEMPLATES ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export interface TemplateDto {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  isActive: boolean;
  color: string;
}

function toTemplate(doc: IContent & { _id: unknown }): TemplateDto {
  return {
    id: String(doc._id),
    name: doc.title ?? '',
    category: doc.category ?? 'General',
    isActive: doc.isActive,
    usageCount: (doc.metadata?.usageCount as number) ?? 0,
    color: (doc.metadata?.color as string) ?? 'bg-slate-300',
  };
}

/** Template create/update bodies (admin content routes). */
export interface TemplateInput {
  name?: string;
  category?: string;
  color?: string;
  isActive?: boolean;
}

export async function listTemplates(): Promise<TemplateDto[]> {
  const docs = await ContentModel.find({ type: 'template' }).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => toTemplate(doc));
}

export async function createTemplate(adminId: string, input: TemplateInput): Promise<TemplateDto> {
  const doc = await ContentModel.create({
    type: 'template',
    title: input.name,
    category: input.category,
    isActive: true,
    metadata: {
      usageCount: 0,
      color: input.color || 'bg-slate-300',
    },
    createdBy: adminId,
  });
  return toTemplate(doc);
}

export async function updateTemplate(
  adminId: string,
  id: string,
  input: TemplateInput,
): Promise<TemplateDto> {
  assertObjectId(id, 'Template');
  const doc = await ContentModel.findOneAndUpdate(
    { _id: id, type: 'template' },
    {
      $set: {
        ...(input.name !== undefined ? { title: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.color !== undefined ? { 'metadata.color': input.color } : {}),
        updatedBy: adminId,
      },
    },
    { new: true },
  ).lean();
  if (!doc) throw ApiError.notFound('Template not found');
  return toTemplate(doc);
}

export async function deleteTemplate(id: string): Promise<{ deleted: boolean }> {
  assertObjectId(id, 'Template');
  const doc = await ContentModel.findOneAndDelete({ _id: id, type: 'template' }).lean();
  if (!doc) throw ApiError.notFound('Template not found');
  return { deleted: true };
}

// ── SETTINGS ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export interface PlatformSettingsDto {
  name: string;
  supportEmail: string;
  schedule: 'weekly' | 'monthly';
  minPayout: number;
  maintenance: boolean;
  /** Admin-set cap for the customer order-file upload, in whole MB. */
  maxUploadFileSizeMb: number;
  /** Master ON/OFF switch for the platform fee (Settings → Platform). */
  platformFeeEnabled: boolean;
  /** Flat per-order platform fee in ₹ (0 = no fee). */
  platformFee: number;
  /** Checkbox: when OFF (default) the platform fee is ALWAYS paid online —
   *  the wallet may only settle the rest of the order. */
  platformFeeFromWallet: boolean;
  /** Validation ceiling for the platformFee input itself (₹). */
  platformFeeMax: number;
  /** GST charged on the order, in percent. */
  gstRatePercent: number;
  /** Gap #9 tax decision: when true (default), GST applies to the composite
   *  supply — subtotal + rush/delivery/platform fees; when false, to the
   *  subtotal only. Flagged as pending CA sign-off in orders/taxation.ts. */
  gstOnFees: boolean;
  /** Customer-facing delivery charge per speed (₹). */
  deliveryFees: Record<'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP', number>;
  /** Promised delivery time per speed, in whole hours. */
  deliveryEtaHours: Record<'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'PICKUP', number>;
  /** Rider search radius for auto-assignment, in km. */
  assignRadiusKm: number;
  /** Max ₹ a single admin wallet credit may carry. */
  walletMaxCredit: number;
  /** Max users per bulk wallet credit call. */
  walletMaxBatchSize: number;
}

export async function getSettings(): Promise<PlatformSettingsDto> {
  const doc = await ContentModel.findOne({ type: 'settings' }).lean();
  const defaults = PLATFORM_SETTING_DEFAULTS;
  if (!doc) {
    return {
      name: 'PrinZex',
      supportEmail: 'support@prinzex.in',
      schedule: 'weekly',
      minPayout: 500,
      maintenance: false,
      maxUploadFileSizeMb: DEFAULT_MAX_UPLOAD_MB,
      platformFeeEnabled: false,
      platformFee: 0,
      platformFeeFromWallet: false,
      platformFeeMax: defaults.platformFeeMax,
      gstRatePercent: defaults.gstRatePercent,
      gstOnFees: defaults.gstOnFees,
      deliveryFees: defaults.deliveryFees,
      deliveryEtaHours: defaults.deliveryEtaHours,
      assignRadiusKm: defaults.assignRadiusKm,
      walletMaxCredit: defaults.walletMaxCredit,
      walletMaxBatchSize: defaults.walletMaxBatchSize,
    };
  }
  const values = platformValuesFromMetadata((doc.metadata ?? {}) as Record<string, unknown>);
  const platformFee = parsePlatformFee(doc.metadata?.platformFee, values.platformFeeMax) ?? 0;
  return {
    name: doc.title ?? 'PrinZex',
    supportEmail: doc.metadata?.supportEmail as string ?? 'support@prinzex.in',
    schedule: doc.metadata?.schedule as 'weekly' | 'monthly' ?? 'weekly',
    minPayout: doc.metadata?.minPayout as number ?? 500,
    maintenance: doc.isActive ?? false,
    maxUploadFileSizeMb: parseMaxUploadMb(doc.metadata?.maxUploadFileSizeMb) ?? DEFAULT_MAX_UPLOAD_MB,
    // The switch defaults to "on" for settings docs written before it existed:
    // a fee the admin already set stayed live then, so it stays live now.
    platformFeeEnabled:
      doc.metadata?.platformFeeEnabled === undefined ? platformFee > 0 : doc.metadata?.platformFeeEnabled === true,
    platformFee,
    platformFeeFromWallet: doc.metadata?.platformFeeFromWallet === true,
    platformFeeMax: values.platformFeeMax,
    gstRatePercent: values.gstRatePercent,
    gstOnFees: values.gstOnFees,
    deliveryFees: values.deliveryFees,
    deliveryEtaHours: values.deliveryEtaHours,
    assignRadiusKm: values.assignRadiusKm,
    walletMaxCredit: values.walletMaxCredit,
    walletMaxBatchSize: values.walletMaxBatchSize,
  };
}

export async function updateSettings(adminId: string, input: PlatformSettingsDto): Promise<PlatformSettingsDto> {
  const maxUploadFileSizeMb = parseMaxUploadMb(input.maxUploadFileSizeMb);
  if (maxUploadFileSizeMb === null) {
    throw ApiError.badRequest(
      `maxUploadFileSizeMb must be a whole number between 1 and ${MAX_CONFIGURABLE_UPLOAD_MB}`,
    );
  }
  // New platform numbers — each validated against its bounds (utils/platformSettings).
  const gstRatePercent = parseBoundedNumber(input.gstRatePercent, SETTING_BOUNDS.gstRatePercent.min, SETTING_BOUNDS.gstRatePercent.max);
  if (gstRatePercent === null) throw ApiError.badRequest('gstRatePercent must be a number between 0 and 28');
  const platformFeeMax = parseBoundedNumber(input.platformFeeMax, SETTING_BOUNDS.platformFeeMax.min, SETTING_BOUNDS.platformFeeMax.max);
  if (platformFeeMax === null) throw ApiError.badRequest('platformFeeMax must be a number between 1 and 1000000 with at most 2 decimal places');
  const assignRadiusKm = parseBoundedNumber(input.assignRadiusKm, SETTING_BOUNDS.assignRadiusKm.min, SETTING_BOUNDS.assignRadiusKm.max, 1);
  if (assignRadiusKm === null) throw ApiError.badRequest('assignRadiusKm must be a number between 1 and 100 (at most 1 decimal)');
  const walletMaxCredit = parseBoundedNumber(input.walletMaxCredit, SETTING_BOUNDS.walletMaxCredit.min, SETTING_BOUNDS.walletMaxCredit.max);
  if (walletMaxCredit === null) throw ApiError.badRequest('walletMaxCredit must be a number between 1 and 10000000 with at most 2 decimal places');
  const walletMaxBatchSize = parseBoundedNumber(input.walletMaxBatchSize, SETTING_BOUNDS.walletMaxBatchSize.min, SETTING_BOUNDS.walletMaxBatchSize.max, 0);
  if (walletMaxBatchSize === null) throw ApiError.badRequest('walletMaxBatchSize must be a whole number between 1 and 2000');
  const deliveryFees = parseSpeedMapStrict(input.deliveryFees, SETTING_BOUNDS.deliveryFee);
  if (deliveryFees === null) throw ApiError.badRequest('deliveryFees must give every speed a charge between 0 and 10000 (at most 2 decimals)');
  const deliveryEtaHours = parseSpeedMapStrict(input.deliveryEtaHours, SETTING_BOUNDS.deliveryEtaHours);
  if (deliveryEtaHours === null) throw ApiError.badRequest('deliveryEtaHours must give every speed a whole number of hours between 1 and 168');

  const platformFee = parsePlatformFee(input.platformFee, platformFeeMax);
  if (platformFee === null) {
    throw ApiError.badRequest(
      `platformFee must be a number between 0 and ${platformFeeMax} with at most 2 decimal places`,
    );
  }
  await ContentModel.findOneAndUpdate(
    { type: 'settings' },
    {
      $set: {
        type: 'settings',
        title: input.name,
        isActive: input.maintenance,
        metadata: {
          supportEmail: input.supportEmail,
          schedule: input.schedule,
          minPayout: input.minPayout,
          maxUploadFileSizeMb,
          platformFeeEnabled: input.platformFeeEnabled === true,
          platformFee,
          platformFeeFromWallet: input.platformFeeFromWallet === true,
          platformFeeMax,
          gstRatePercent,
          gstOnFees: input.gstOnFees === true,
          deliveryFees,
          deliveryEtaHours,
          assignRadiusKm,
          walletMaxCredit,
          walletMaxBatchSize,
        },
        updatedBy: adminId,
      },
    },
    { upsert: true, new: true }
  );
  // The upload path reads this value through a 60s cache — flush it so the
  // new cap applies on the very next upload.
  invalidateUploadLimitCache();
  // Same for the platform fee the order/quote path caches for 60s.
  invalidatePlatformFeeCache();
  return getSettings();
}
