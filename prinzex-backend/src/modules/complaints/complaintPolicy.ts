/**
 * Dispute-flow policy — pure rules, no I/O, so the state machine and the
 * evidence requirements are unit-testable without a database.
 *
 * Lifecycle (see schema.prisma `Complaint`):
 *
 *   customer reports issue (+ photos, or a MANDATORY unboxing video for
 *   missing_pages)
 *     → pending_seller          seller has a response window (platform-
 *                               configured hours, default 24)
 *       → seller accepts        refundOrderToSource fires immediately
 *                               (→ refunded once money actually moves)
 *       → seller rejects        MUST give a reason
 *       → window expires        auto-escalates to admin (escalatedBy system)
 *     → customer disagrees with EITHER seller decision → escalated
 *     → admin decision is FINAL → refunded | closed
 */

export const COMPLAINT_TYPES = [
  'missing_pages',
  'wrong_item',
  'print_quality',
  'damaged_in_transit',
] as const;
export type ComplaintTypeValue = (typeof COMPLAINT_TYPES)[number];

export const COMPLAINT_STATUSES = [
  'pending_seller',
  'seller_accepted',
  'seller_rejected',
  'escalated',
  'refunded',
  'closed',
] as const;
export type ComplaintStatusValue = (typeof COMPLAINT_STATUSES)[number];

/** Fallback when the platform-settings store has no usable value. */
export const DEFAULT_COMPLAINT_RESPONSE_WINDOW_HOURS = 24;
export const COMPLAINT_WINDOW_BOUNDS = { min: 1, max: 168 } as const;

export const COMPLAINT_TYPE_LABELS: Record<ComplaintTypeValue, string> = {
  missing_pages: 'Missing pages',
  wrong_item: 'Wrong item printed',
  print_quality: 'Print quality issue',
  damaged_in_transit: 'Damaged in transit',
};

export interface EvidenceRequirements {
  /** Unboxing video is MANDATORY (missing_pages only). */
  videoRequired: boolean;
  /** Photos required for every other type; optional alongside the video. */
  photosRequired: boolean;
  /** Whether the seal-intact yes/no check applies to this claim type. */
  sealCheckApplies: boolean;
}

export function evidenceRequirements(type: ComplaintTypeValue): EvidenceRequirements {
  if (type === 'missing_pages') {
    return { videoRequired: true, photosRequired: false, sealCheckApplies: true };
  }
  return { videoRequired: false, photosRequired: true, sealCheckApplies: false };
}

export function isComplaintType(value: string): value is ComplaintTypeValue {
  return (COMPLAINT_TYPES as readonly string[]).includes(value);
}

/**
 * Validate the evidence payload for a claim type. Returns an error message,
 * or null when the evidence satisfies the requirements.
 */
export function validateEvidence(
  type: ComplaintTypeValue,
  evidence: { photoUrls: string[]; videoUrl: string | null },
): string | null {
  const req = evidenceRequirements(type);
  if (req.videoRequired && !evidence.videoUrl) {
    return 'Missing-pages claims require an unboxing video — please upload the video of you opening the parcel.';
  }
  if (req.photosRequired && evidence.photoUrls.length === 0) {
    return 'Please attach at least one photo showing the issue.';
  }
  if (!req.videoRequired && evidence.videoUrl) {
    return 'An unboxing video is only accepted for missing-pages claims — photos are enough here.';
  }
  return null;
}

/** Seller may accept/reject only while the complaint awaits their decision. */
export function canSellerDecide(status: ComplaintStatusValue): boolean {
  return status === 'pending_seller';
}

/**
 * Customer may escalate once the seller has decided (either way) — including
 * an accepted+refunded claim they still disagree with. Terminal admin states
 * and the still-open seller window cannot be escalated (the window has its
 * own auto-escalation).
 */
export function canCustomerEscalate(status: ComplaintStatusValue): boolean {
  return status === 'seller_accepted' || status === 'seller_rejected' || status === 'refunded';
}

/**
 * Admin is the final tier: acts on escalated complaints, plus seller-decided
 * ones that never escalated (e.g. retrying a refund that failed at the
 * gateway after a seller accept, or closing a rejection the customer never
 * disputed but ops reviewed).
 */
export function canAdminDecide(status: ComplaintStatusValue): boolean {
  return status === 'escalated' || status === 'seller_accepted' || status === 'seller_rejected';
}

export function isTerminal(status: ComplaintStatusValue): boolean {
  return status === 'refunded' || status === 'closed';
}

/** Human-readable window label for UIs ("24h response window"). */
export function windowLabel(hours: number): string {
  return `${hours}h`;
}

/** Compute the seller-response deadline from a creation timestamp. */
export function sellerRespondByFrom(createdAt: Date, windowHours: number): Date {
  return new Date(createdAt.getTime() + windowHours * 60 * 60 * 1000);
}

/** True when a pending complaint is past its seller-response deadline. */
export function isWindowExpired(status: ComplaintStatusValue, sellerRespondBy: Date, now: Date): boolean {
  return status === 'pending_seller' && sellerRespondBy.getTime() <= now.getTime();
}
