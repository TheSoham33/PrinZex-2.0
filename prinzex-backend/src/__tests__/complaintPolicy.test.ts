import {
  canAdminDecide,
  canCustomerEscalate,
  canSellerDecide,
  COMPLAINT_TYPES,
  evidenceRequirements,
  isTerminal,
  isWindowExpired,
  sellerRespondByFrom,
  validateEvidence,
} from '../modules/complaints/complaintPolicy';

describe('complaint policy (dispute flow)', () => {
  describe('evidence requirements', () => {
    it('makes the unboxing video mandatory for missing_pages', () => {
      expect(evidenceRequirements('missing_pages').videoRequired).toBe(true);
      expect(
        validateEvidence('missing_pages', { photoUrls: ['p'], videoUrl: null }),
      ).toMatch(/unboxing video/);
      expect(
        validateEvidence('missing_pages', { photoUrls: [], videoUrl: 'v' }),
      ).toBeNull();
    });

    it('requires photos (and no video) for the other types', () => {
      for (const type of COMPLAINT_TYPES.filter((t) => t !== 'missing_pages')) {
        expect(evidenceRequirements(type).photosRequired).toBe(true);
        expect(validateEvidence(type, { photoUrls: [], videoUrl: null })).toMatch(/photo/);
        expect(validateEvidence(type, { photoUrls: ['p'], videoUrl: null })).toBeNull();
        expect(validateEvidence(type, { photoUrls: ['p'], videoUrl: 'v' })).toMatch(/missing-pages/);
      }
    });

    it('applies the seal check only to missing_pages', () => {
      expect(evidenceRequirements('missing_pages').sealCheckApplies).toBe(true);
      expect(evidenceRequirements('damaged_in_transit').sealCheckApplies).toBe(false);
    });
  });

  describe('state machine', () => {
    it('lets the seller decide only while pending', () => {
      expect(canSellerDecide('pending_seller')).toBe(true);
      expect(canSellerDecide('escalated')).toBe(false);
      expect(canSellerDecide('closed')).toBe(false);
    });

    it('lets the customer dispute either seller decision, but not the open window', () => {
      expect(canCustomerEscalate('seller_accepted')).toBe(true);
      expect(canCustomerEscalate('seller_rejected')).toBe(true);
      expect(canCustomerEscalate('refunded')).toBe(true);
      expect(canCustomerEscalate('pending_seller')).toBe(false);
      expect(canCustomerEscalate('closed')).toBe(false);
    });

    it('keeps admin out of the seller window but final afterwards', () => {
      expect(canAdminDecide('pending_seller')).toBe(false);
      expect(canAdminDecide('escalated')).toBe(true);
      expect(canAdminDecide('seller_rejected')).toBe(true);
      expect(canAdminDecide('refunded')).toBe(false);
      expect(canAdminDecide('closed')).toBe(false);
    });

    it('treats refunded and closed as terminal', () => {
      expect(isTerminal('refunded')).toBe(true);
      expect(isTerminal('closed')).toBe(true);
      expect(isTerminal('escalated')).toBe(false);
    });
  });

  describe('response window', () => {
    it('computes the deadline from the configured hours', () => {
      const created = new Date('2026-09-13T10:00:00Z');
      expect(sellerRespondByFrom(created, 24).toISOString()).toBe('2026-09-14T10:00:00.000Z');
      expect(sellerRespondByFrom(created, 1).toISOString()).toBe('2026-09-13T11:00:00.000Z');
    });

    it('flags expiry only for pending complaints past the deadline', () => {
      const deadline = new Date('2026-09-14T10:00:00Z');
      expect(isWindowExpired('pending_seller', deadline, new Date('2026-09-14T10:00:01Z'))).toBe(true);
      expect(isWindowExpired('pending_seller', deadline, new Date('2026-09-14T09:00:00Z'))).toBe(false);
      expect(isWindowExpired('seller_accepted', deadline, new Date('2026-09-15T00:00:00Z'))).toBe(false);
    });
  });
});
