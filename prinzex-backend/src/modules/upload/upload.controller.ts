import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as uploadService from './upload.service';

/** Upload controllers — routes mount `authenticate` (any signed-in actor). */

export const uploadDesign = asyncHandler(async (req, res) => {
  if (!req.user || !('userId' in req.user)) {
    throw ApiError.unauthorized();
  }
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded — send a file in the "file" form field');
  }
  const result = await uploadService.registerDesignUpload(req.user.userId, req.file);
  res.status(201).json(new ApiResponse(201, result, 'Design file uploaded'));
});

export const deleteDesign = asyncHandler(async (req, res) => {
  if (!req.user || !('userId' in req.user)) {
    throw ApiError.unauthorized();
  }
  const result = await uploadService.deleteDesignUpload(req.user.userId, req.params.filename);
  res.status(200).json(new ApiResponse(200, result, 'File deleted'));
});
