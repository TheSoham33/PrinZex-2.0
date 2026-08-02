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
