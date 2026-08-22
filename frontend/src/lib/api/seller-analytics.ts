import { apiRequest } from './client';

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface ServiceBreakdown {
  serviceName: string;
  count: number;
  revenue: number;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  completionRate: number;
  onTimeRate: number;
  averageRating?: number;
}

export const fetchAnalyticsOverview = async (period: string): Promise<AnalyticsOverview> => {
  return apiRequest<AnalyticsOverview>('/seller/analytics/overview', { params: { period } });
};

export const fetchRevenueByDay = async (period: string): Promise<DailyRevenue[]> => {
  return apiRequest<DailyRevenue[]>('/seller/analytics/revenue-by-day', { params: { period } });
};

export const fetchServiceBreakdown = async (): Promise<ServiceBreakdown[]> => {
  const res = await apiRequest<any[]>('/seller/analytics/service-breakdown');
  return res.map(item => ({
    serviceName: item.serviceName,
    count: item.orders,
    revenue: item.revenue
  }));
};
