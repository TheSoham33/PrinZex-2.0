/**
 * Runnable check for Lamination pricing: the mandatory film thickness is
 * charged per laminated sheet on top of the per-page rates — 80 micron free,
 * catalogue defaults as fallback, seller override prices win, and the charge
 * scales with pages × copies. Mirrors the backend computeQuote film branch
 * (orders.helpers.ts).
 *
 *   npx tsx scripts/check-lamination.ts
 */
import assert from 'node:assert/strict';
import { computeCost } from '../src/components/order/orderReducer';
import type { OrderSpecifications, ServiceOffering } from '../src/lib/types';

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

const cost = (over: Partial<OrderSpecifications>, svc = service) =>
  computeCost({ ...baseSpecs, ...over }, svc, 0, 0);

/* Pages only: no film choice ⇒ free 80 micron default. */
assert.equal(cost({}).subtotal, 30);
assert.equal(cost({ filmThickness: 'micron-80' }).subtotal, 30);

/* Priced films add per sheet: 10 sheets × ₹2 / ×₹4. */
assert.equal(cost({ filmThickness: 'micron-125' }).subtotal, 30 + 2 * 10);
assert.equal(cost({ filmThickness: 'micron-250' }).subtotal, 30 + 4 * 10);

/* Film charge scales with pages and copies. */
assert.equal(
  cost({ filmThickness: 'micron-125', totalPages: 20, quantity: 2 }).subtotal,
  (3 * 20 + 2 * 20) * 2,
);

/* Seller override price wins over the catalogue default. */
const sellerPriced = {
  ...service,
  filmThicknessOptions: { 'micron-250': 6 },
} as unknown as ServiceOffering;
assert.equal(
  cost({ filmThickness: 'micron-250' }, sellerPriced).subtotal,
  30 + 6 * 10,
);

/* Film keys are scoped to lam-film: never charged on other services. */
const docPrint = {
  id: 'doc-print',
  name: 'Document Printing',
  unit: 'per page',
  startingPrice: 3,
} as unknown as ServiceOffering;
assert.equal(cost({ filmThickness: 'micron-250' }, docPrint).subtotal, 30);

/* Leaked stapling from an earlier doc-print selection must not inflate a
 * lamination estimate — both spec groups are service-scoped. */
assert.equal(
  cost({ filmThickness: 'micron-125', stapling: 'corner-stapling' }).subtotal,
  30 + 2 * 10,
);

/* …while stapling itself still prices on doc-print (drift guard regression). */
assert.equal(
  cost({ serviceId: 'doc-print', stapling: 'corner-stapling' }, docPrint)
    .subtotal,
  30 + 5,
);

console.log('check-lamination: OK');
