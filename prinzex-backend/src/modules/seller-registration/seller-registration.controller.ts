import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { CustomerTokenPayload, SellerTokenPayload } from '../../utils/jwt';
import * as registrationService from './seller-registration.service';
import type { RegisterSellerInput } from './seller-registration.schema';
import type { SellerDocumentType } from '../../utils/fileUpload';

/** Narrowed request — routes mount authenticate (+ role gate per route). The
 *  onboarding flow starts from a CUSTOMER token and may later present a
 *  SELLER token, so both shapes are accepted here. */
function applicant(req: Request): CustomerTokenPayload | SellerTokenPayload {
  const user = req.user;
  if (!user || (user.role !== 'CUSTOMER' && user.role !== 'SELLER')) {
    throw ApiError.forbidden('Customer or seller access required');
  }
  return user;
}

// POST /api/seller/register — CUSTOMER token only (first application).
export const register = asyncHandler(async (req, res) => {
  const user = applicant(req);
  if (user.role !== 'CUSTOMER') {
    throw ApiError.conflict('You have already applied as a seller');
  }
  const seller = await registrationService.register(user.userId, req.body as RegisterSellerInput);
  res.status(201).json(new ApiResponse(201, { seller }, 'Store application submitted — under review'));
});

// POST /api/seller/register/documents — multer ran before this handler.
export const uploadDocuments = asyncHandler(async (req, res) => {
  const files = req.files as Partial<Record<SellerDocumentType, Express.Multer.File[]>> | undefined;
  const documents = await registrationService.uploadDocuments(applicant(req), files);
  res.status(200).json(new ApiResponse(200, { documents }, 'Documents uploaded'));
});

// GET /api/seller/register/status
export const getStatus = asyncHandler(async (req, res) => {
  const status = await registrationService.getRegistrationStatus(applicant(req));
  res.status(200).json(new ApiResponse(200, status, 'Registration status fetched'));
});
