/**
 * Lamination pricing — ported 1:1 from scripts/check-lamination.ts: the
 * mandatory film thickness is charged per laminated sheet on top of the
 * per-page rates. Mirrors the backend computeQuote film branch.
 */
import { computeCost } from '../components/order/orderReducer';
import type { OrderSpecifications, ServiceOffering } from '../lib/types';

const service = {
  id: 'lam-film',
  name: 'Lamination',
  unit: 'per page',
  startingPrice: 3, // ₹3 B&W page rate keeps the math obvious
} as unknown as ServiceOffering;

const baseSpecs: OrderSpecifications = {
  serviceId: 'lam-film',
  paperType: 'standard',
  size: 'A4',
  quantity: 1,
  colorOption: 'bw',
  totalPages: 10,
};

const cost = (over: Partial<OrderSpecifications>, svc: ServiceOffering = service) =>
  computeCost({ ...baseSpecs, ...over }, svc, 0, 0);

describe('lamination film pricing (computeCost)', () => {
  test('no film choice ⇒ free 80 micron default', () => {
    expect(cost({}).subtotal).toBe(30);
    expect(cost({ filmThickness: 'micron-80' }).subtotal).toBe(30);
  });

  test('priced films add per sheet: 10 sheets × ₹2 / × ₹4', () => {
    expect(cost({ filmThickness: 'micron-125' }).subtotal).toBe(30 + 2 * 10);
    expect(cost({ filmThickness: 'micron-250' }).subtotal).toBe(30 + 4 * 10);
  });

  test('film charge scales with pages and copies', () => {
    expect(cost({ filmThickness: 'micron-125', totalPages: 20, quantity: 2 }).subtotal).toBe(
      (3 * 20 + 2 * 20) * 2,
    );
  });

  test('seller override price wins over the catalogue default', () => {
    const sellerPriced = {
      ...service,
      filmThicknessOptions: { 'micron-250': 6 },
    } as unknown as ServiceOffering;
    expect(cost({ filmThickness: 'micron-250' }, sellerPriced).subtotal).toBe(30 + 6 * 10);
  });

  test('film keys are scoped to lam-film: never charged on other services', () => {
    const docPrint = {
      id: 'doc-print',
      name: 'Document Printing',
      unit: 'per page',
      startingPrice: 3,
    } as unknown as ServiceOffering;
    expect(cost({ filmThickness: 'micron-250' }, docPrint).subtotal).toBe(30);
  });

  test('a leaked stapling spec must not inflate a lamination estimate (scoped add-ons)', () => {
    expect(cost({ filmThickness: 'micron-125', stapling: 'corner-stapling' }).subtotal).toBe(
      30 + 2 * 10,
    );
  });

  test('…while stapling itself still prices on doc-print (drift guard regression)', () => {
    const docPrint = {
      id: 'doc-print',
      name: 'Document Printing',
      unit: 'per page',
      startingPrice: 3,
    } as unknown as ServiceOffering;
    expect(
      cost({ serviceId: 'doc-print', stapling: 'corner-stapling' }, docPrint).subtotal,
    ).toBe(30 + 5);
  });
});
