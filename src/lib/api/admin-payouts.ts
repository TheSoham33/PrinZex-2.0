import { api } from '@/lib/api-client';
import type {
  SellerPayout,
  DeliveryPayout,
  Banner,
  ServiceCategoryRow,
  TemplateRow,
  FaqCategory,
  AdminAccount,
  CommissionRow,
  ActivityLogEntry,
} from '@/lib/types/admin-payouts';

export const fetchSellerPayouts = async (): Promise<SellerPayout[]> =>
  api.get<SellerPayout[]>('/api/admin/payouts');

export const fetchDeliveryPayouts = async (): Promise<DeliveryPayout[]> =>
  api.get<DeliveryPayout[]>('/api/admin/payouts/delivery');

export const fetchBanners = async (): Promise<Banner[]> =>
  api.get<Banner[]>('/api/admin/content/banners');

export const fetchCategories = async (): Promise<ServiceCategoryRow[]> =>
  api.get<ServiceCategoryRow[]>('/api/admin/content/categories');

export const fetchTemplates = async (): Promise<TemplateRow[]> =>
  api.get<TemplateRow[]>('/api/admin/content/templates');

export const fetchFaqs = async (): Promise<FaqCategory[]> =>
  api.get<FaqCategory[]>('/api/admin/content/faqs');

export const fetchAdminAccounts = async (): Promise<AdminAccount[]> =>
  api.get<AdminAccount[]>('/api/admin/content/accounts');

export const fetchCommissions = async (): Promise<CommissionRow[]> =>
  api.get<CommissionRow[]>('/api/admin/content/commissions');

export const fetchActivityLog = async (): Promise<ActivityLogEntry[]> =>
  api.get<ActivityLogEntry[]>('/api/admin/content/activity');
