import { get, getList } from './client';

export const fetchPayouts = async (params: any = {}): Promise<any[]> => getList('/admin/payouts', params);

// Aliases for frontend compatibility in Payouts page
export const fetchSellerPayouts = async () => fetchPayouts({ recipientType: 'seller' });
export const fetchDeliveryPayouts = async () => fetchPayouts({ recipientType: 'delivery_boy' });

export const fetchAdminAnalyticsKPI = async (params: any = {}): Promise<any> => get('/admin/analytics/kpi', params);

export const fetchCommissions = async (): Promise<any[]> => {
  // Mocking global commissions for now
  return [
    { categoryId: 'cat_documents', category: 'Document Printing', rate: 12 },
    { categoryId: 'cat_photos', category: 'Photo Printing', rate: 15 },
    { categoryId: 'cat_business', category: 'Business Stationery', rate: 10 },
  ];
};
