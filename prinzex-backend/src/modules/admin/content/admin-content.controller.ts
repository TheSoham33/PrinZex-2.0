import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminContentService from './admin-content.service';
import type {
  BannerCreateBody,
  BannerUpdateBody,
  FaqCreateBody,
  FaqUpdateBody,
  PublicBannersQuery,
  PublicFaqsQuery,
  ReorderBody,
} from './admin-content.routes';

/** Admin content management. logActivity is fire-and-forget (no await). */

export const listBanners = asyncHandler(async (_req, res) => {
  const banners = await adminContentService.listBanners();
  res.status(200).json(new ApiResponse(200, banners, 'Banners fetched'));
});

export const createBanner = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const banner = await adminContentService.createBanner(identity.adminId, req.body as BannerCreateBody);
  void logActivity({
    ...identity,
    action: 'content.banner.created',
    entityType: 'content',
    entityId: banner.id,
    metadata: { title: banner.title, order: banner.order },
    req,
  });
  res.status(201).json(new ApiResponse(201, banner, 'Banner created'));
});

export const updateBanner = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const banner = await adminContentService.updateBanner(identity.adminId, req.params.id, req.body as BannerUpdateBody);
  void logActivity({
    ...identity,
    action: 'content.banner.updated',
    entityType: 'content',
    entityId: banner.id,
    metadata: { fields: Object.keys(req.body as BannerUpdateBody) },
    req,
  });
  res.status(200).json(new ApiResponse(200, banner, 'Banner updated'));
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const result = await adminContentService.deleteBanner(req.params.id);
  void logActivity({
    ...adminIdentity(req),
    action: 'content.banner.deleted',
    entityType: 'content',
    entityId: req.params.id,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Banner deleted'));
});

export const reorderBanners = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const { orderedIds } = req.body as ReorderBody;
  const result = await adminContentService.reorderBanners(identity.adminId, orderedIds);
  void logActivity({
    ...identity,
    action: 'content.banner.reordered',
    entityType: 'content',
    entityId: 'banners',
    metadata: { orderedIds, reordered: result.reordered },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, `${result.reordered} banner(s) reordered`));
});

export const listFaqs = asyncHandler(async (_req, res) => {
  const groups = await adminContentService.listFaqsGrouped();
  res.status(200).json(new ApiResponse(200, groups, 'FAQs fetched'));
});

export const createFaq = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const faq = await adminContentService.createFaq(identity.adminId, req.body as FaqCreateBody);
  void logActivity({
    ...identity,
    action: 'content.faq.created',
    entityType: 'content',
    entityId: faq.id,
    metadata: { title: faq.title, category: faq.category },
    req,
  });
  res.status(201).json(new ApiResponse(201, faq, 'FAQ created'));
});

export const updateFaq = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const faq = await adminContentService.updateFaq(identity.adminId, req.params.id, req.body as FaqUpdateBody);
  void logActivity({
    ...identity,
    action: 'content.faq.updated',
    entityType: 'content',
    entityId: faq.id,
    metadata: { fields: Object.keys(req.body as FaqUpdateBody) },
    req,
  });
  res.status(200).json(new ApiResponse(200, faq, 'FAQ updated'));
});

export const deleteFaq = asyncHandler(async (req, res) => {
  const result = await adminContentService.deleteFaq(req.params.id);
  void logActivity({
    ...adminIdentity(req),
    action: 'content.faq.deleted',
    entityType: 'content',
    entityId: req.params.id,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'FAQ deleted'));
});

// ── CATEGORIES ─────────────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await adminContentService.listCategories();
  res.status(200).json(new ApiResponse(200, categories, 'Categories fetched'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const category = await adminContentService.updateCategory(identity.adminId, req.params.id, req.body);
  void logActivity({
    ...identity,
    action: 'content.category.updated',
    entityType: 'content',
    entityId: category.id,
    metadata: { isActive: category.isActive },
    req,
  });
  res.status(200).json(new ApiResponse(200, category, 'Category updated'));
});

// ── TEMPLATES ──────────────────────────────────────────────────────────────

export const listTemplates = asyncHandler(async (_req, res) => {
  const templates = await adminContentService.listTemplates();
  res.status(200).json(new ApiResponse(200, templates, 'Templates fetched'));
});

export const createTemplate = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const template = await adminContentService.createTemplate(identity.adminId, req.body);
  void logActivity({
    ...identity,
    action: 'content.template.created',
    entityType: 'content',
    entityId: template.id,
    metadata: { name: template.name },
    req,
  });
  res.status(201).json(new ApiResponse(201, template, 'Template created'));
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const template = await adminContentService.updateTemplate(identity.adminId, req.params.id, req.body);
  void logActivity({
    ...identity,
    action: 'content.template.updated',
    entityType: 'content',
    entityId: template.id,
    req,
  });
  res.status(200).json(new ApiResponse(200, template, 'Template updated'));
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const result = await adminContentService.deleteTemplate(req.params.id);
  void logActivity({
    ...adminIdentity(req),
    action: 'content.template.deleted',
    entityType: 'content',
    entityId: req.params.id,
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Template deleted'));
});

// ── SETTINGS ───────────────────────────────────────────────────────────────

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await adminContentService.getSettings();
  res.status(200).json(new ApiResponse(200, settings, 'Settings fetched'));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const settings = await adminContentService.updateSettings(identity.adminId, req.body as adminContentService.PlatformSettingsDto);
  void logActivity({
    ...identity,
    action: 'content.settings.updated',
    entityType: 'content',
    entityId: 'settings',
    req,
  });
  res.status(200).json(new ApiResponse(200, settings, 'Settings updated'));
});

// ══ PUBLIC (no auth) — /api/content ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export const listPublicBanners = asyncHandler(async (req, res) => {
  const { isActive } = req.query as unknown as PublicBannersQuery;
  const banners = await adminContentService.listBanners(isActive === 'true');
  res.status(200).json(new ApiResponse(200, banners, 'Banners fetched'));
});

export const listPublicFaqs = asyncHandler(async (req, res) => {
  const { category } = req.query as unknown as PublicFaqsQuery;
  const groups = await adminContentService.listFaqsGrouped(category, true);
  res.status(200).json(new ApiResponse(200, groups, 'FAQs fetched'));
});
