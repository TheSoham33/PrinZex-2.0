import { fakeDelay } from '@/lib/utils';
import {
  MOCK_ACTIVITY_LOG,
  MOCK_ADMIN_ACCOUNTS,
  MOCK_BANNERS,
  MOCK_CATEGORIES,
  MOCK_COMMISSIONS,
  MOCK_DELIVERY_PAYOUTS,
  MOCK_FAQS,
  MOCK_SELLER_PAYOUTS,
  MOCK_TEMPLATES,
  type ActivityLogEntry,
  type AdminAccount,
  type Banner,
  type CommissionRow,
  type DeliveryPayout,
  type FaqCategory,
  type SellerPayout,
  type ServiceCategoryRow,
  type TemplateRow,
} from '@/lib/mock-data/admin-payouts';

export const fetchSellerPayouts = async (): Promise<SellerPayout[]> => {
  await fakeDelay();
  return MOCK_SELLER_PAYOUTS;
};

export const fetchDeliveryPayouts = async (): Promise<DeliveryPayout[]> => {
  await fakeDelay();
  return MOCK_DELIVERY_PAYOUTS;
};

export const fetchBanners = async (): Promise<Banner[]> => {
  await fakeDelay();
  return MOCK_BANNERS;
};

export const fetchCategories = async (): Promise<ServiceCategoryRow[]> => {
  await fakeDelay();
  return MOCK_CATEGORIES;
};

export const fetchTemplates = async (): Promise<TemplateRow[]> => {
  await fakeDelay();
  return MOCK_TEMPLATES;
};

export const fetchFaqs = async (): Promise<FaqCategory[]> => {
  await fakeDelay();
  return MOCK_FAQS;
};

export const fetchAdminAccounts = async (): Promise<AdminAccount[]> => {
  await fakeDelay();
  return MOCK_ADMIN_ACCOUNTS;
};

export const fetchCommissions = async (): Promise<CommissionRow[]> => {
  await fakeDelay();
  return MOCK_COMMISSIONS;
};

export const fetchActivityLog = async (): Promise<ActivityLogEntry[]> => {
  await fakeDelay();
  return MOCK_ACTIVITY_LOG;
};
