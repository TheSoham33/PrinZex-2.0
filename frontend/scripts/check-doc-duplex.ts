/**
 * Runnable check for Document-Printing duplex pricing: double-sided billing
 * halves the page count to physical SHEETS (ceil), colour follows duplex
 * sheet pairing, and the estimate exposes billablePages for the summary.
 * Mirrors the backend computeQuote branch (orders.helpers.ts).
 *
 *   npx tsx scripts/check-doc-duplex.ts
 */
import assert from 'node:assert/strict';
import { computeCost } from '../src/components/order/orderReducer';
import type { OrderSpecifications, ServiceOffering } from '../src/lib/types';

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
  finishing: [],
  totalPages: 60,
};

const cost = (over: Partial<OrderSpecifications>) =>
  computeCost({ ...baseSpecs, ...over }, service, 0, 0);

/* Single-sided: page count is billed as-is. */
assert.equal(cost({ printSides: 'single' }).subtotal, 60);
assert.equal(cost({}).subtotal, 60); // unset behaves as single

/* Double-sided: billed per sheet — 60 pages → 30 sheets. */
const duplex = cost({ printSides: 'double' });
assert.equal(duplex.subtotal, 30);
assert.equal(duplex.billablePages, 30);

/* Odd page counts round up to one more sheet (61 → 31). */
const odd = cost({ printSides: 'double', totalPages: 61 });
assert.equal(odd.billablePages, 31);
assert.equal(odd.subtotal, 31);

/* All-colour duplex: every sheet is a colour sheet (2× rate → 60). */
assert.equal(cost({ printSides: 'double', colorOption: 'color' }).subtotal, 60);

/* Mixed sides 1,2 duplex: both land on sheet 1 → 1 colour sheet + 29 B&W. */
const mixedDuplex = cost({ printSides: 'double', colorOption: 'mixed', colorPages: '1,2' });
assert.equal(mixedDuplex.subtotal, 29 * 1 + 1 * 2);

/* Same document single-sided: 2 colour pages + 58 B&W. */
const mixedSingle = cost({ printSides: 'single', colorOption: 'mixed', colorPages: '1,2' });
assert.equal(mixedSingle.subtotal, 58 * 1 + 2 * 2);

/* Quantity multiplies sheets, not pages, in duplex. */
assert.equal(cost({ printSides: 'double', quantity: 3 }).subtotal, 90);

/* Stapling is a dedicated mandatory spec (not finishing), charged per set:
 * 'loose' is free, unset behaves as 'loose', and the catalogue default price
 * applies when the seller saved no stapling prices. */
const sellerService = {
  ...service,
  staplingOptions: { 'corner-stapling': 7 }, // seller override wins over catalogue ₹5
} as unknown as ServiceOffering;
const sellerCost = (over: Partial<OrderSpecifications>) =>
  computeCost({ ...baseSpecs, ...over }, sellerService, 0, 0);

assert.equal(cost({ stapling: 'loose' }).subtotal, 60); // free default
assert.equal(cost({ stapling: undefined }).subtotal, 60); // unset = loose
assert.equal(cost({ stapling: 'corner-stapling' }).subtotal, 60 + 5); // catalogue default ₹5
assert.equal(cost({ stapling: 'corner-stapling', quantity: 2 }).subtotal, (60 + 5) * 2); // per set
assert.equal(sellerCost({ stapling: 'corner-stapling' }).subtotal, 60 + 7); // seller ₹7 wins
assert.equal(sellerCost({ stapling: 'side-stapling' }).subtotal, 60 + 10); // seller didn't price → default ₹10
/* Unknown stapling key never charges. */
assert.equal(cost({ stapling: 'not-a-thing' }).subtotal, 60);

console.log('doc-print duplex pricing checks: OK');
