/**
 * Runnable check for the printable-document classifier and the Office page-
 * count reader. Fixtures are real ZIPs generated with jszip (the same lib
 * the runtime uses), so the assertions exercise the actual parse path:
 * DOCX <Pages> metadata, PPTX slide-XML counting (authoritative over the
 * <Slides> metadata), and honest nulls for legacy/unreadable files.
 *
 *   npx tsx scripts/check-upload-types.ts
 */
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_DOCUMENT_DESCRIPTION,
  fileExtension,
  pageCountStrategy,
  readOfficePageCount,
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

async function main() {
/* ── Automatic page counts from real Office containers ─────────────────── */

const asFile = async (zip: JSZip, name: string) =>
  new File([await zip.generateAsync({ type: 'arraybuffer' })], name);

/** Same app-props skeleton Office writes (root element carries namespaces). */
const APP_PROPS = (pages: number, slides: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
  `<Pages>${pages}</Pages><Slides>${slides}</Slides></Properties>`;

/* DOCX: Word's stored <Pages> metadata is used. */
const docx = new JSZip();
docx.file('word/document.xml', '<w:document/>');
docx.file('docProps/app.xml', APP_PROPS(7, 0));
assert.equal(await readOfficePageCount(await asFile(docx, 'notes.docx')), 7);

/* PPTX: slide XML files win over the <Slides> metadata line. */
const pptx = new JSZip();
for (let i = 1; i <= 3; i++) pptx.file(`ppt/slides/slide${i}.xml`, '<p:sld/>');
pptx.file('ppt/slides/notes1.xml', '<p:notes/>'); // must NOT count
pptx.file('ppt/slideLayouts/slideLayout1.xml', '<p:sldLayout/>'); // must NOT count
pptx.file('docProps/app.xml', APP_PROPS(0, 2)); // stale metadata on purpose
assert.equal(await readOfficePageCount(await asFile(pptx, 'deck.pptx')), 3);

/* PPTX without slide XMLs (odd generator) falls back to <Slides> metadata. */
const deckMeta = new JSZip();
deckMeta.file('docProps/app.xml', APP_PROPS(0, 4));
assert.equal(await readOfficePageCount(await asFile(deckMeta, 'meta.pptx')), 4);

/* DOCX without metadata (tool didn't write one) → null → manual entry. */
const bare = new JSZip();
bare.file('word/document.xml', '<w:document/>');
assert.equal(await readOfficePageCount(await asFile(bare, 'bare.docx')), null);

/* Legacy formats and impostors get no number, not a wrong one. */
assert.equal(await readOfficePageCount(new File([new Uint8Array([0xd0, 0xcf])], 'old.doc')), null);
assert.equal(await readOfficePageCount(new File([new Uint8Array([0xd0, 0xcf])], 'old.ppt')), null);
assert.equal(await readOfficePageCount(new File(['plain text'], 'fake.docx')), null);

  console.log('check-upload-types: OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
