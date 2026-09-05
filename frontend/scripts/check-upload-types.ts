/**
 * Runnable check for the printable-document classifier: extension → page-
 * count strategy ('pdf' exact in-browser, 'image' one sheet, 'office'
 * converted server-side), plus the accept-attribute string staying in sync
 * with the classifier.
 *
 *   npx tsx scripts/check-upload-types.ts
 */
import assert from 'node:assert/strict';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_DOCUMENT_DESCRIPTION,
  fileExtension,
  pageCountStrategy,
} from '../src/lib/domain/files';

/* Exact extension → strategy table. */
const CASES: Array<[string, ReturnType<typeof pageCountStrategy>]> = [
  ['report.pdf', 'pdf'],
  ['scan.PDF', 'pdf'], // case-insensitive
  ['photo.jpg', 'image'],
  ['photo.jpeg', 'image'],
  ['photo.PNG', 'image'],
  ['notes.doc', 'office'],
  ['notes.docx', 'office'],
  ['deck.ppt', 'office'],
  ['deck.PPTX', 'office'],
  ['sheet.xlsx', null], // not accepted
  ['archive.zip', null], // renamed containers don't sneak in client-side
  ['no-extension', null],
  ['.pdf', null], // dotfile, not a real name
  ['trick.pdf.docx', 'office'], // last extension wins (server sniffs bytes anyway)
];
for (const [name, expected] of CASES) {
  assert.equal(pageCountStrategy(name), expected, name);
}

/* fileExtension keeps its promise about edge names. */
assert.equal(fileExtension('a.b.docx'), 'docx');
assert.equal(fileExtension('DOC'), '');

/* accept-attribute + error copy cover every accepted type (and nothing else). */
const accepted = ACCEPTED_DOCUMENT_TYPES.split(',').map((t) => t.slice(1));
assert.deepEqual(accepted.sort(), ['doc', 'docx', 'jpeg', 'jpg', 'pdf', 'png', 'ppt', 'pptx']);
for (const ext of accepted) {
  assert.ok(pageCountStrategy(`f.${ext}`) !== null, `${ext} classified`);
  assert.ok(
    ACCEPTED_DOCUMENT_DESCRIPTION.toLowerCase().includes(ext),
    `${ext} mentioned in the description`,
  );
}

console.log('check-upload-types: OK');
