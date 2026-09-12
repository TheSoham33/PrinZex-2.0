import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import * as logsService from './admin-logs.service';

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  
  const result = await logsService.listLogs({
    adminId: req.query.adminId as string,
    entityType: req.query.entityType as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page,
    limit,
  });

  res.status(200).json(new ApiResponse(200, result, 'Activity logs retrieved'));
});
