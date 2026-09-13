import { apiRequest, get, patch } from './client';

export const fetchStoreInfo = async (): Promise<any> => get('/seller/store');

export const updateStoreInfo = async (data: any): Promise<any> => patch('/seller/store', data);

export const updateDeliverySettings = async (data: { deliveryRadius?: number; pincodes?: { pincode: string; isExcluded: boolean }[] }): Promise<any> => patch('/seller/settings/delivery', data);

export const updateStoreHours = async (hours: any[]): Promise<any> => patch('/seller/settings/hours', { hours });

export const updateNotificationSettings = async (preferences: Record<string, boolean>): Promise<any> => patch('/seller/settings/notifications', { preferences });

// NOTE: pricing overrides have exactly one writer — updatePricingOverrides in
// ./seller-inventory (used by the seller Pricing page). A second copy here
// would silently diverge.

// ── KYC documents ──────────────────────────────────────────────────────────
// The seller settings page reuses the onboarding document lane (the SAME
// endpoints a fresh application uses): POST /api/seller/register/documents
// (multipart) and GET /api/seller/register/status. Both accept the seller JWT,
// so an approved seller can self-serve re-uploads (expired GST, rejected
// documents) without going through support. Admin verification reuses the
// existing queue (POST /api/admin/sellers/:sellerId/verify-document).

export type SellerDocumentType =
  | 'gst_certificate'
  | 'business_license'
  | 'owner_id'
  | 'address_proof';

/** One KYC document's verification state (mirrors backend DocumentStatus). */
export interface SellerKycDocument {
  docType: SellerDocumentType;
  uploaded: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  uploadedAt: string | null;
}

export interface SellerKycStatus {
  sellerId: string;
  status: string;
  isVerified: boolean;
  rejectionReason: string | null;
  documents: SellerKycDocument[];
}

/** GET /api/seller/register/status — document statuses for the KYC section. */
export const fetchSellerKycStatus = async (): Promise<SellerKycStatus> =>
  get('/seller/register/status');

/**
 * POST /api/seller/register/documents — multipart upload. Re-uploading a doc
 * type REPLACES the file and resets its verification (backend behavior), so
 * the UI must tell the seller the document goes back to "pending review".
 */
export const uploadSellerKycDocuments = async (formData: FormData): Promise<SellerKycDocument[]> => {
  const res = await apiRequest<{ documents: SellerKycDocument[] }>('/seller/register/documents', {
    method: 'POST',
    body: formData,
  });
  return res.documents;
};

