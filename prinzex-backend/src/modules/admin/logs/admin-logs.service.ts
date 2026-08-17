import { ActivityLogModel } from '../../../models/mongo/ActivityLog.model';
import { buildPaginatedResponse, type PaginatedResponse } from '../../../utils/pagination';

export interface LogsQuery {
  adminId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export async function listLogs(query: LogsQuery): Promise<PaginatedResponse<any>> {
  const filter: any = {};
  
  if (query.adminId) filter.adminId = query.adminId;
  if (query.entityType) filter.entityType = query.entityType;
  
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const skip = (query.page - 1) * query.limit;
  
  const [total, rows] = await Promise.all([
    ActivityLogModel.countDocuments(filter),
    ActivityLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
  ]);

  return buildPaginatedResponse(rows, total, { page: query.page, limit: query.limit });
}
