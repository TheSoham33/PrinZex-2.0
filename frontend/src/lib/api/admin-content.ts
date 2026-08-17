import { apiRequest } from './client';

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
  const res = await apiRequest<any>('/admin/content/banners');
  const data = res.data || res;
  return data.map((b: any) => ({
    ...b,
    active: b.isActive,
    color: 'from-blue-500 to-indigo-600'
  }));
};

export const createBanner = async (data: any): Promise<Banner> => {
  return apiRequest<Banner>('/admin/content/banners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateBanner = async (id: string, data: any): Promise<Banner> => {
  return apiRequest<Banner>(`/admin/content/banners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteBanner = async (id: string): Promise<void> => {
  return apiRequest<void>(`/admin/content/banners/${id}`, {
    method: 'DELETE',
  });
};

export const reorderBanners = async (orderedIds: string[]): Promise<void> => {
  return apiRequest<void>('/admin/content/banners/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
};

// ── FAQs ───────────────────────────────────────────────────────────────────

export const fetchFaqs = async (): Promise<FaqCategory[]> => {
  const groups = await apiRequest<any[]>('/admin/content/faqs');
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

export const createFaq = async (data: any): Promise<any> => {
  return apiRequest<any>('/admin/content/faqs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateFaq = async (id: string, data: any): Promise<any> => {
  return apiRequest<any>(`/admin/content/faqs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteFaq = async (id: string): Promise<void> => {
  return apiRequest<void>(`/admin/content/faqs/${id}`, {
    method: 'DELETE',
  });
};

// ── Categories ─────────────────────────────────────────────────────────────

export const fetchCategories = async (): Promise<ServiceCategoryRow[]> => {
  const res = await apiRequest<any>('/admin/content/categories');
  const data = res.data || res;
  return data.map((c: any) => ({
    ...c,
    active: c.isActive 
  }));
};

export const updateCategory = async (id: string, data: { isActive: boolean }): Promise<any> => {
  return apiRequest<any>(`/admin/content/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// ── Templates ──────────────────────────────────────────────────────────────

export const fetchTemplates = async (): Promise<TemplateRow[]> => {
  const res = await apiRequest<any>('/admin/content/templates');
  const data = res.data || res;
  return data.map((t: any) => ({
    ...t,
    active: t.isActive 
  }));
};

export const createTemplate = async (data: any): Promise<TemplateRow> => {
  return apiRequest<TemplateRow>('/admin/content/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTemplate = async (id: string, data: any): Promise<TemplateRow> => {
  return apiRequest<TemplateRow>(`/admin/content/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  return apiRequest<void>(`/admin/content/templates/${id}`, {
    method: 'DELETE',
  });
};

// ── Settings ───────────────────────────────────────────────────────────────

export const fetchPlatformSettings = async (): Promise<any> => {
  return apiRequest<any>('/admin/content/settings');
};

export const updatePlatformSettings = async (data: any): Promise<any> => {
  return apiRequest<any>('/admin/content/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};
