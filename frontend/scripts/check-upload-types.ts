/**
 * Runnable check for the printable-document classifier: extension → page-
 * count strategy ('pdf' exact in-browser, 'image' one sheet), plus the
 * accept-attribute string staying in sync with the classifier. Only PDF and
 * images are accepted — Word/Excel/PowerPoint are NOT, since Office→PDF
 * conversion was removed.
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
  ['deck.ppt', null], // not accepted — convert to PDF first
  ['deck.PPTX', null],
  ['notes.doc', null],
  ['notes.docx', null],
  ['sheet.xlsx', null],
  ['budget.XLS', null],
  ['archive.zip', null], // renamed containers don't sneak in client-side
  ['no-extension', null],
  ['.pdf', null], // dotfile, not a real name
  ['trick.pdf.docx', null], // last extension wins; docx is no longer accepted
];
for (const [name, expected] of CASES) {
  assert.equal(pageCountStrategy(name), expected, name);
}

/* fileExtension keeps its promise about edge names. */
assert.equal(fileExtension('a.b.jpeg'), 'jpeg');
assert.equal(fileExtension('DOC'), '');

/* accept-attribute + error copy cover every accepted type (and nothing else). */
const accepted = ACCEPTED_DOCUMENT_TYPES.split(',').map((t) => t.slice(1));
assert.deepEqual(accepted.sort(), ['jpeg', 'jpg', 'pdf', 'png']);
for (const ext of accepted) {
  assert.ok(pageCountStrategy(`f.${ext}`) !== null, `${ext} classified`);
  assert.ok(
    ACCEPTED_DOCUMENT_DESCRIPTION.toLowerCase().includes(ext),
    `${ext} mentioned in the description`,
  );
}

console.log('check-upload-types: OK');
