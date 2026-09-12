/**
 * Document-Printing duplex pricing — ported 1:1 from
 * scripts/check-doc-duplex.ts: double-sided billing halves the page count to
 * physical SHEETS (ceil), colour follows duplex sheet pairing, stapling is a
 * dedicated per-set spec. Mirrors the backend computeQuote branch.
 */
import { computeCost } from '../components/order/orderReducer';
import type { OrderSpecifications, ServiceOffering } from '../lib/types';

const service = {
  id: 'doc-print',
  name: 'Document Printing',
  unit: 'per page',
  startingPrice: 1, // ₹1 B&W rate keeps the math obvious
} as unknown as ServiceOffering;

const baseSpecs: OrderSpecifications = {
  serviceId: 'doc-print',
  paperType: 'standard',
  size: 'A4',
  quantity: 1,
  colorOption: 'bw',
  totalPages: 60,
};

const cost = (over: Partial<OrderSpecifications>) =>
  computeCost({ ...baseSpecs, ...over }, service, 0, 0);

describe('doc-print duplex pricing (computeCost)', () => {
  test('single-sided: page count is billed as-is (unset behaves as single)', () => {
    expect(cost({ printSides: 'single' }).subtotal).toBe(60);
    expect(cost({}).subtotal).toBe(60);
  });

  test('double-sided: billed per sheet — 60 pages → 30 sheets', () => {
    const duplex = cost({ printSides: 'double' });
    expect(duplex.subtotal).toBe(30);
    expect(duplex.billablePages).toBe(30);
  });

  test('odd page counts round up to one more sheet (61 → 31)', () => {
    const odd = cost({ printSides: 'double', totalPages: 61 });
    expect(odd.billablePages).toBe(31);
    expect(odd.subtotal).toBe(31);
  });

  test('all-colour duplex: every sheet is a colour sheet (2× rate → 60)', () => {
    expect(cost({ printSides: 'double', colorOption: 'color' }).subtotal).toBe(60);
  });

  test('mixed duplex: pages 1,2 share sheet 1 → 1 colour sheet + 29 B&W', () => {
    expect(cost({ printSides: 'double', colorOption: 'mixed', colorPages: '1,2' }).subtotal).toBe(
      29 * 1 + 1 * 2,
    );
  });

  test('the same document single-sided: 2 colour pages + 58 B&W', () => {
    expect(
      cost({ printSides: 'single', colorOption: 'mixed', colorPages: '1,2' }).subtotal,
    ).toBe(58 * 1 + 2 * 2);
  });

  test('quantity multiplies sheets, not pages, in duplex', () => {
    expect(cost({ printSides: 'double', quantity: 3 }).subtotal).toBe(90);
  });

  describe('stapling — dedicated per-set spec with catalogue/seller prices', () => {
    const sellerService = {
      ...service,
      staplingOptions: { 'corner-stapling': 7 }, // seller override wins over catalogue ₹5
    } as unknown as ServiceOffering;
    const sellerCost = (over: Partial<OrderSpecifications>) =>
      computeCost({ ...baseSpecs, ...over }, sellerService, 0, 0);

    test("'loose' is free and unset behaves as 'loose'", () => {
      expect(cost({ stapling: 'loose' }).subtotal).toBe(60);
      expect(cost({ stapling: undefined }).subtotal).toBe(60);
    });

    test('catalogue default ₹5 applies when the seller saved no prices; per set', () => {
      expect(cost({ stapling: 'corner-stapling' }).subtotal).toBe(60 + 5);
      expect(cost({ stapling: 'corner-stapling', quantity: 2 }).subtotal).toBe((60 + 5) * 2);
    });

    test('seller ₹7 wins; unpriced keys fall back to the catalogue default ₹10', () => {
      expect(sellerCost({ stapling: 'corner-stapling' }).subtotal).toBe(60 + 7);
      expect(sellerCost({ stapling: 'side-stapling' }).subtotal).toBe(60 + 10);
    });

    test('unknown stapling key never charges', () => {
      expect(cost({ stapling: 'not-a-thing' }).subtotal).toBe(60);
    });
  });
});
