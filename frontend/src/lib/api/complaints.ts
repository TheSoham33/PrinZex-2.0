import { apiRequest, get, getList, post } from './client';

/** Dispute flow client (customer → seller → admin final). */

export type ComplaintType =
  | 'missing_pages'
  | 'wrong_item'
  | 'print_quality'
  | 'damaged_in_transit';

export type ComplaintStatus =
  | 'pending_seller'
  | 'seller_accepted'
  | 'seller_rejected'
  | 'escalated'
  | 'refunded'
  | 'closed';

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  missing_pages: 'Missing pages',
  wrong_item: 'Wrong item printed',
  print_quality: 'Print quality issue',
  damaged_in_transit: 'Damaged in transit',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending_seller: 'Awaiting store response',
  seller_accepted: 'Accepted by store',
  seller_rejected: 'Declined by store',
  escalated: 'With admin (final review)',
  refunded: 'Refunded',
  closed: 'Closed',
};

export interface Complaint {
  id: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  type: ComplaintType;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
  sealIntact: boolean | null;
  status: ComplaintStatus;
  sellerRespondBy: string;
  sellerResponseAt: string | null;
  sellerRejectReason: string | null;
  escalatedBy: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintDetail {
  complaint: Complaint;
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number | string;
    createdAt: string;
    estimatedDelivery: string;
  };
  customer: { id: string; name: string; email: string | null; phone: string | null };
  seller: { id: string; storeName: string };
  delivery: {
    status: string;
    deliveredAt: string | null;
    failedAt: string | null;
    failReason: string | null;
  } | null;
  timeline: Array<{ status: string; label: string; timestamp: string; note?: string }>;
}

export interface CreateComplaintInput {
  orderId: string;
  type: ComplaintType;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
}

/** POST /upload/evidence — one photo or the unboxing video (multipart). */
export const uploadEvidence = (file: File): Promise<{ fileUrl: string }> => {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<{ fileUrl: string }>('/upload/evidence', { method: 'POST', body });
};

// ── Customer ───────────────────────────────────────────────────────────────

export const createComplaint = (input: CreateComplaintInput): Promise<Complaint> =>
  post<Complaint>('/complaints', input);

export const fetchMyComplaints = (orderId?: string): Promise<Complaint[]> =>
  getList<Complaint>('/complaints/mine', orderId ? { orderId } : undefined);

export const escalateComplaint = (id: string, reason?: string): Promise<Complaint> =>
  post<Complaint>(`/complaints/${id}/escalate`, reason ? { reason } : {});

// ── Seller ─────────────────────────────────────────────────────────────────

export const fetchSellerComplaints = (): Promise<Complaint[]> =>
  getList<Complaint>('/seller/complaints');

export const acceptComplaint = (
  id: string,
  input: { sealIntact?: boolean } = {},
): Promise<Complaint> => post<Complaint>(`/seller/complaints/${id}/accept`, input);

export const rejectComplaint = (
  id: string,
  input: { reason: string; sealIntact?: boolean },
): Promise<Complaint> => post<Complaint>(`/seller/complaints/${id}/reject`, input);

// ── Admin (final tier) ─────────────────────────────────────────────────────

export const fetchAdminComplaints = (status?: string): Promise<Complaint[]> =>
  getList<Complaint>('/admin/complaints', status ? { status } : undefined);

export const fetchComplaintDetail = (id: string): Promise<ComplaintDetail> =>
  get<ComplaintDetail>(`/complaints/${id}`);

export const fetchSellerComplaintDetail = (id: string): Promise<ComplaintDetail> =>
  get<ComplaintDetail>(`/seller/complaints/${id}`);

export const fetchAdminComplaintDetail = (id: string): Promise<ComplaintDetail> =>
  get<ComplaintDetail>(`/admin/complaints/${id}`);

export const adminRefundComplaint = (id: string, note?: string): Promise<Complaint> =>
  post<Complaint>(`/admin/complaints/${id}/refund`, note ? { note } : {});

export const adminCloseComplaint = (id: string, note?: string): Promise<Complaint> =>
  post<Complaint>(`/admin/complaints/${id}/close`, note ? { note } : {});

export const adminSetSealIntact = (id: string, intact: boolean): Promise<Complaint> =>
  post<Complaint>(`/admin/complaints/${id}/seal`, { intact });
