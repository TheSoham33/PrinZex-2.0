/**
 * Runnable check for the dispute flow's pure rules + evidence magic bytes:
 *
 *   evidence requirements → missing_pages REQUIRES the unboxing video (photos
 *                           optional); every other type requires ≥1 photo and
 *                           rejects a video
 *   state machine         → seller decides only in pending_seller; customer
 *                           escalates only after a seller decision; admin is
 *                           final on escalated/seller-decided; refunded and
 *                           closed are terminal
 *   response window       → deadline = created + hours; expiry detection only
 *                           for pending_seller
 *   evidence magic bytes  → png/jpg at offset 0, mp4/mov `ftyp` at offset 4,
 *                           webm EBML head; mismatches delete + 415
 *
 *   npx tsx scripts/check-complaint-flow.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  canAdminDecide,
  canCustomerEscalate,
  canSellerDecide,
  DEFAULT_COMPLAINT_RESPONSE_WINDOW_HOURS,
  evidenceRequirements,
  isComplaintType,
  isTerminal,
  isWindowExpired,
  sellerRespondByFrom,
  validateEvidence,
} from '../src/modules/complaints/complaintPolicy';
import { verifyEvidenceMagicBytes } from '../src/utils/fileUpload';
import { ApiError } from '../src/utils/ApiError';

async function writeTemp(name: string, bytes: Buffer): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'evidence-'));
  const file = path.join(dir, name);
  await fs.promises.writeFile(file, bytes);
  return file;
}

async function run(): Promise<void> {
  /* Evidence requirements per type. */
  assert.deepEqual(evidenceRequirements('missing_pages'), {
    videoRequired: true,
    photosRequired: false,
    sealCheckApplies: true,
  });
  for (const type of ['wrong_item', 'print_quality', 'damaged_in_transit'] as const) {
    assert.deepEqual(evidenceRequirements(type), {
      videoRequired: false,
      photosRequired: true,
      sealCheckApplies: false,
    });
  }
  assert.ok(isComplaintType('missing_pages'));
  assert.ok(!isComplaintType('lost_my_homework'));

  /* missing_pages: video mandatory, photos optional. */
  assert.match(
    validateEvidence('missing_pages', { photoUrls: ['/uploads/evidence/a.png'], videoUrl: null }) ?? '',
    /unboxing video/,
  );
  assert.equal(
    validateEvidence('missing_pages', { photoUrls: [], videoUrl: '/uploads/evidence/v.mp4' }),
    null,
  );
  /* Other types: photos mandatory; a video is rejected. */
  assert.match(
    validateEvidence('print_quality', { photoUrls: [], videoUrl: null }) ?? '',
    /at least one photo/,
  );
  assert.equal(validateEvidence('print_quality', { photoUrls: ['/uploads/evidence/a.png'], videoUrl: null }), null);
  assert.match(
    validateEvidence('wrong_item', { photoUrls: ['/uploads/evidence/a.png'], videoUrl: '/uploads/evidence/v.mp4' }) ?? '',
    /only accepted for missing-pages/,
  );

  /* State machine. */
  assert.ok(canSellerDecide('pending_seller'));
  assert.ok(!canSellerDecide('escalated'));
  assert.ok(!canSellerDecide('refunded'));
  for (const s of ['seller_accepted', 'seller_rejected', 'refunded'] as const) {
    assert.ok(canCustomerEscalate(s), `customer must be able to dispute ${s}`);
  }
  assert.ok(!canCustomerEscalate('pending_seller'), 'window has its own auto-escalation');
  assert.ok(!canCustomerEscalate('closed'));
  for (const s of ['escalated', 'seller_accepted', 'seller_rejected'] as const) {
    assert.ok(canAdminDecide(s));
  }
  assert.ok(!canAdminDecide('pending_seller'), 'admin does not act during the seller window');
  assert.ok(!canAdminDecide('closed'));
  assert.ok(isTerminal('refunded') && isTerminal('closed'));
  assert.ok(!isTerminal('escalated'));

  /* Response window math + expiry detection. */
  assert.equal(DEFAULT_COMPLAINT_RESPONSE_WINDOW_HOURS, 24);
  const created = new Date('2026-09-13T10:00:00Z');
  const deadline = sellerRespondByFrom(created, 24);
  assert.equal(deadline.toISOString(), '2026-09-14T10:00:00.000Z');
  assert.ok(!isWindowExpired('pending_seller', deadline, new Date('2026-09-14T09:59:00Z')));
  assert.ok(isWindowExpired('pending_seller', deadline, new Date('2026-09-14T10:00:00Z')));
  assert.ok(!isWindowExpired('seller_accepted', deadline, new Date('2026-09-20T00:00:00Z')));

  /* Evidence magic bytes: positives. */
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp', 'ascii'), Buffer.from('isom'), Buffer.alloc(4)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(8)]);
  assert.equal(await verifyEvidenceMagicBytes(await writeTemp('a.png', png)), '.png');
  assert.equal(await verifyEvidenceMagicBytes(await writeTemp('a.jpg', jpg)), '.jpg');
  assert.equal(await verifyEvidenceMagicBytes(await writeTemp('v.mp4', mp4)), '.mp4');
  assert.equal(await verifyEvidenceMagicBytes(await writeTemp('v.mov', mp4)), '.mov');
  assert.equal(await verifyEvidenceMagicBytes(await writeTemp('v.webm', webm)), '.webm');

  /* Evidence magic bytes: mismatch → 415 + file deleted. */
  const fake = await writeTemp('fake.mp4', png); // png bytes under an .mp4 name
  await assert.rejects(verifyEvidenceMagicBytes(fake), (e: unknown) => e instanceof ApiError && e.statusCode === 415);
  assert.ok(!fs.existsSync(fake), 'mismatched evidence file must be deleted');

  console.log('check-complaint-flow: all assertions passed');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
