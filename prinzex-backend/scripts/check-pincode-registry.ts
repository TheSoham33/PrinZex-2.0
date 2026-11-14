/**
 * Runnable check for the structured-geography layer (pincode registry):
 *
 *   normalizePincode → only exact 6-digit strings canonicalize; whitespace
 *                      and bad shapes rejected
 *   coversPincode    → no coverage rows = unrestricted (ops default); with
 *                      rows, ONLY exact equality matches; missing order
 *                      pincode + rows = not covered
 *   pincodeOfAddress → reads the deliveryAddress JSON snapshot safely
 *
 *   npx tsx scripts/check-pincode-registry.ts
 */
import assert from 'node:assert/strict';
import { coversPincode, isValidPincode, normalizePincode, pincodeOfAddress } from '../src/utils/pincodes';

function run(): void {
  /* Canonicalization. */
  assert.equal(normalizePincode('700091'), '700091');
  assert.equal(normalizePincode(' 700016 '), '700016');
  assert.equal(normalizePincode('70001'), null);
  assert.equal(normalizePincode('7000166'), null);
  assert.equal(normalizePincode('70001a'), null);
  assert.equal(normalizePincode(''), null);
  assert.equal(normalizePincode(null), null);
  assert.equal(normalizePincode(700016), null);
  assert.ok(isValidPincode('700064'));
  assert.ok(!isValidPincode('salt lake'));

  /* Coverage matching is exact equality — no fuzzy zone strings. */
  assert.ok(coversPincode([], '700091'), 'no rows = unrestricted');
  assert.ok(coversPincode([], null), 'no rows = unrestricted even without order pincode');
  assert.ok(coversPincode(['700091', '700064'], '700091'));
  assert.ok(!coversPincode(['700091', '700064'], '700016'), 'exact match only');
  assert.ok(!coversPincode(['700091'], 'Salt Lake'), 'zone names never match');
  assert.ok(!coversPincode(['700091'], null), 'rows but no order pincode = not covered');

  /* Order address snapshot extraction. */
  assert.equal(pincodeOfAddress({ pincode: '700029', fullAddress: 'X' }), '700029');
  assert.equal(pincodeOfAddress({ pincode: ' 700032 ' }), '700032');
  assert.equal(pincodeOfAddress({ fullAddress: 'no pin' }), null);
  assert.equal(pincodeOfAddress(null), null);
  assert.equal(pincodeOfAddress('700016'), null);

  console.log('check-pincode-registry: all assertions passed');
}

run();
