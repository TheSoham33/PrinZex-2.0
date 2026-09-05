import { get, post, patch, del } from './client';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  order: number;
  color?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  name: string;
  items: FAQItem[];
}

export interface ServiceCategoryRow {
  id: string;
  name: string;
  slug: string;
  serviceCount: number;
  active: boolean;
}

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  active: boolean;
  color: string;
}

// ── Banners ────────────────────────────────────────────────────────────────

export const fetchBanners = async (): Promise<Banner[]> => {
  const res = await get('/admin/content/banners');
  const data = res;
  return data.map((b: any) => ({
    ...b,
    active: b.isActive,
    color: 'from-blue-500 to-indigo-600'
  }));
};

export const createBanner = async (data: any): Promise<Banner> => post<Banner>('/admin/content/banners', data);

export const updateBanner = async (id: string, data: any): Promise<Banner> => patch<Banner>(`/admin/content/banners/${id}`, data);

export const deleteBanner = async (id: string): Promise<void> => {
  return del<void>(`/admin/content/banners/${id}`);
};

export const reorderBanners = async (orderedIds: string[]): Promise<void> => patch<void>('/admin/content/banners/reorder', { orderedIds });

// ── FAQs ───────────────────────────────────────────────────────────────────

export const fetchFaqs = async (): Promise<FaqCategory[]> => {
  const groups = await get<any[]>('/admin/content/faqs');
  return groups.map((g: any) => ({
    id: g.category,
    name: g.category,
    items: g.faqs.map((f: any) => ({
      id: f.id,
      question: f.title,
      answer: f.body
    }))
  }));
};

export const createFaq = async (data: any): Promise<any> => post('/admin/content/faqs', data);

export const updateFaq = async (id: string, data: any): Promise<any> => patch(`/admin/content/faqs/${id}`, data);

export const deleteFaq = async (id: string): Promise<void> => {
  return del<void>(`/admin/content/faqs/${id}`);
};

// ── Categories ─────────────────────────────────────────────────────────────

export const fetchCategories = async (): Promise<ServiceCategoryRow[]> => {
  const res = await get('/admin/content/categories');
  const data = res;
  return data.map((c: any) => ({
    ...c,
    active: c.isActive 
  }));
};

export const updateCategory = async (id: string, data: { isActive: boolean }): Promise<any> => patch(`/admin/content/categories/${id}`, data);

// ── Templates ──────────────────────────────────────────────────────────────

export const fetchTemplates = async (): Promise<TemplateRow[]> => {
  const res = await get('/admin/content/templates');
  const data = res;
  return data.map((t: any) => ({
    ...t,
    active: t.isActive 
  }));
};

export const createTemplate = async (data: any): Promise<TemplateRow> => post<TemplateRow>('/admin/content/templates', data);

export const updateTemplate = async (id: string, data: any): Promise<TemplateRow> => patch<TemplateRow>(`/admin/content/templates/${id}`, data);

export const deleteTemplate = async (id: string): Promise<void> => {
  return del<void>(`/admin/content/templates/${id}`);
};

// ── Settings ───────────────────────────────────────────────────────────────

export const fetchPlatformSettings = async (): Promise<any> => get('/admin/content/settings');

export const updatePlatformSettings = async (data: any): Promise<any> => patch('/admin/content/settings', data);
