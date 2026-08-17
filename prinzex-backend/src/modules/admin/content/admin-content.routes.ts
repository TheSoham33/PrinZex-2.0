import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminContentController from './admin-content.controller';

/**
 * Content management — mounted at /api/admin/content (admin) and
 * /api/content (public, no auth). MongoDB Content model backs both.
 * Spec's canManageContent → vocabulary: reads content.view, writes content.manage.
 */

export const bannerCreateBody = z.object({
  title: z.string().trim().min(1).max(200),
  imageUrl: z.string().trim().min(1).max(500),
  linkUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const bannerUpdateBody = bannerCreateBody.partial();
export type BannerCreateBody = z.infer<typeof bannerCreateBody>;
export type BannerUpdateBody = z.infer<typeof bannerUpdateBody>;

export const reorderBody = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, 'Provide the banner ids in their new order'),
});
export type ReorderBody = z.infer<typeof reorderBody>;

export const faqCreateBody = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(100),
  order: z.number().int().min(0).optional(),
});

export const faqUpdateBody = faqCreateBody.partial();
export type FaqCreateBody = z.infer<typeof faqCreateBody>;
export type FaqUpdateBody = z.infer<typeof faqUpdateBody>;

export const mongoIdParams = z.object({ id: z.string().min(1) });

export const publicBannersQuery = z.object({
  isActive: z.enum(['true', 'false']).default('true'),
});

export const publicFaqsQuery = z.object({
  category: z.string().trim().min(1).max(100).optional(),
});

export type PublicBannersQuery = z.infer<typeof publicBannersQuery>;
export type PublicFaqsQuery = z.infer<typeof publicFaqsQuery>;

export const adminContentRouter = Router();

// Banners
adminContentRouter.get('/banners', requirePermission('content.view'), adminContentController.listBanners);
adminContentRouter.post('/banners', requirePermission('content.manage'), validate({ body: bannerCreateBody }), adminContentController.createBanner);
// Static route BEFORE /banners/:id so "reorder" is never captured as an id.
adminContentRouter.patch('/banners/reorder', requirePermission('content.manage'), validate({ body: reorderBody }), adminContentController.reorderBanners);
adminContentRouter.patch('/banners/:id', requirePermission('content.manage'), validate({ params: mongoIdParams, body: bannerUpdateBody }), adminContentController.updateBanner);
adminContentRouter.delete('/banners/:id', requirePermission('content.manage'), validate({ params: mongoIdParams }), adminContentController.deleteBanner);

// FAQs
adminContentRouter.get('/faqs', requirePermission('content.view'), adminContentController.listFaqs);
adminContentRouter.post('/faqs', requirePermission('content.manage'), validate({ body: faqCreateBody }), adminContentController.createFaq);
adminContentRouter.patch('/faqs/:id', requirePermission('content.manage'), validate({ params: mongoIdParams, body: faqUpdateBody }), adminContentController.updateFaq);
adminContentRouter.delete('/faqs/:id', requirePermission('content.manage'), validate({ params: mongoIdParams }), adminContentController.deleteFaq);

// Categories
adminContentRouter.get('/categories', requirePermission('content.view'), adminContentController.listCategories);
adminContentRouter.patch('/categories/:id', requirePermission('content.manage'), adminContentController.updateCategory);

// Templates
adminContentRouter.get('/templates', requirePermission('content.view'), adminContentController.listTemplates);
adminContentRouter.post('/templates', requirePermission('content.manage'), adminContentController.createTemplate);
adminContentRouter.patch('/templates/:id', requirePermission('content.manage'), adminContentController.updateTemplate);
adminContentRouter.delete('/templates/:id', requirePermission('content.manage'), adminContentController.deleteTemplate);

// Settings
adminContentRouter.get('/settings', requirePermission('content.view'), adminContentController.getSettings);
adminContentRouter.patch('/settings', requirePermission('content.manage'), adminContentController.updateSettings);

/**
 * PUBLIC content — mounted at /api/content with NO auth middleware
 * (homepage banners, FAQ page).
 */
export const publicContentRouter = Router();

publicContentRouter.get('/banners', validate({ query: publicBannersQuery }), adminContentController.listPublicBanners);
publicContentRouter.get('/faqs', validate({ query: publicFaqsQuery }), adminContentController.listPublicFaqs);
