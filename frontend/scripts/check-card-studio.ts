/**
 * Runnable check for the card-studio model — geometry, z-order and the
 * trust-boundary doc parser. No DOM, no framework: plain asserts.
 *
 *   npx tsx scripts/check-card-studio.ts
 */
import assert from 'node:assert/strict';
import {
  BLEED_MM,
  MAX_TEXT_PT,
  MIN_SIZE_MM,
  MIN_TEXT_PT,
  addElement,
  clampElement,
  createDoc,
  docFromImage,
  duplicateElement,
  exportPixels,
  moveElementBy,
  moveLayer,
  parseDoc,
  ptToMm,
  removeElement,
  resizeElement,
  serializeDoc,
  type ImageElement,
  type ShapeElement,
  type StudioDoc,
  type TextElement,
} from '../src/components/order/card-studio/model';

const STANDARD = { w: 89, h: 51 };

/* Export dimensions: trim + 3 mm bleed per side at 300 DPI. */
assert.deepEqual(exportPixels(STANDARD), { w: 1122, h: 673 });
assert.deepEqual(exportPixels({ w: 65, h: 65 }), { w: 839, h: 839 });
assert.deepEqual(exportPixels({ w: 85, h: 45 }), { w: 1075, h: 602 });
assert.equal(ptToMm(72), 25.4); // 1 pt = 1/72in

/* Clamping keeps elements inside the bleed box. */
const shape = (over: Partial<ShapeElement>): ShapeElement => ({
  id: 'a',
  kind: 'shape',
  shape: 'rect',
  color: '#000',
  x: 0,
  y: 0,
  w: 20,
  h: 10,
  ...over,
});
let el = clampElement(shape({ x: -10, y: 200 }), STANDARD);
assert.equal(el.x, -BLEED_MM);
assert.equal(el.y, STANDARD.h + BLEED_MM - 10);
el = clampElement(shape({ w: 0.5 }), STANDARD);
assert.equal(el.w, MIN_SIZE_MM);
el = clampElement(shape({ x: 100 }), STANDARD);
assert.equal(el.x, STANDARD.w + BLEED_MM - 20);

/* Oversized elements PAN under the cover-clamp: free inside the covering
   range, pinned at the bleed edges, never exposing a blank strip. */
const big = shape({ x: -3, y: -3, w: 120, h: 57 });
let pan = clampElement(big, STANDARD);
assert.equal(pan.x, -BLEED_MM); // near edge pinned
pan = clampElement({ ...big, x: -20 }, STANDARD);
assert.equal(pan.x, -20); // inside the covering range — kept as dragged
pan = clampElement({ ...big, x: -40 }, STANDARD);
assert.equal(pan.x, STANDARD.w + BLEED_MM - 120); // = -28: far edge pinned
pan = clampElement({ ...big, x: 10 }, STANDARD);
assert.equal(pan.x, -BLEED_MM); // would expose background on the left
pan = clampElement(shape({ x: 5, w: STANDARD.w + 2 * BLEED_MM }), STANDARD);
assert.equal(pan.x, -BLEED_MM); // exactly bleed-size locks in place

/* Text has a 3pt floor and may overhang the card keeping a 2 mm grip
   inside the bleed box on some edge — asserts live below the fixture. */
assert.equal(MIN_TEXT_PT, 3);

/* Move + clamp composition. */
el = moveElementBy(shape({ x: 5, y: 5 }), 1000, -1000, STANDARD);
assert.equal(el.x, STANDARD.w + BLEED_MM - 20);
assert.equal(el.y, -BLEED_MM);

/* Resize: images keep aspect from the horizontal delta. */
const img = (over: Partial<ImageElement>): ImageElement => ({
  id: 'i',
  kind: 'image',
  url: 'data:x',
  name: 'x',
  x: 10,
  y: 10,
  w: 40,
  h: 20,
  ...over,
});
let resized = resizeElement(img({}), 'se', 10, -100, STANDARD);
assert.equal(resized.w, 50);
assert.equal(resized.h, 25); // aspect preserved despite dy
resized = resizeElement(img({}), 'nw', 10, 0, STANDARD);
assert.equal(resized.w, 30);
assert.equal(resized.x, 20); // shrank toward the left edge
assert.equal(resized.y, 10 + 20 - 15); // h followed the locked aspect

/* Resize: text rescales font, width snaps to the applied size. */
const FONT_CHECK = 'Arial, sans-serif';
const text = (over: Partial<TextElement>): TextElement => ({
  id: 't',
  kind: 'text',
  text: 'hello',
  color: '#000',
  fontFamily: FONT_CHECK,
  fontSize: 12,
  bold: false,
  italic: false,
  align: 'left',
  x: 5,
  y: 5,
  w: 40,
  h: 5.5,
  ...over,
});
let grown = resizeElement(text({}), 'se', 20, 0, STANDARD);
assert.equal(grown.fontSize, 18);
assert.equal(grown.w, 60);
let shrunk = resizeElement(text({}), 'se', -1000, 0, STANDARD);
assert.equal(shrunk.fontSize, MIN_TEXT_PT);
let exploded = resizeElement(text({}), 'se', 100000, 0, STANDARD);
assert.equal(exploded.fontSize, MAX_TEXT_PT);

/* Text overhang: free outside the card, but a 2 mm sliver always stays
   inside the bleed box so the block can't be pushed offstage and lost. */
let tClamp = clampElement(text({ x: -100, y: 5, w: 40 }), STANDARD);
assert.equal(tClamp.x, -40 - BLEED_MM + 2); // = -41: leftmost, 2mm visible
tClamp = clampElement(text({ x: 500, y: 5, w: 40 }), STANDARD);
assert.equal(tClamp.x, STANDARD.w + BLEED_MM - 2); // = 90: rightmost
tClamp = clampElement(text({ x: -100, y: -100, w: 40 }), STANDARD);
assert.equal(tClamp.y, -5.5 - BLEED_MM + 2); // fixture h=5.5 → -6.5
tClamp = clampElement(text({ x: 5, y: 5, w: 40 }), STANDARD);
assert.equal(tClamp.x, 5); // inside range — untouched

/* Z-order as array order. */
let doc: StudioDoc = createDoc();
for (const id of ['one', 'two', 'three']) {
  doc = addElement(doc, shape({ id }));
}
assert.deepEqual(doc.elements.map((e) => e.id), ['one', 'two', 'three']);
doc = moveLayer(doc, 'two', 'up');
assert.deepEqual(doc.elements.map((e) => e.id), ['one', 'three', 'two']);
doc = moveLayer(doc, 'two', 'up'); // already on top — no-op
assert.deepEqual(doc.elements.map((e) => e.id), ['one', 'three', 'two']);
doc = moveLayer(doc, 'one', 'down'); // already at the bottom — no-op
assert.deepEqual(doc.elements.map((e) => e.id), ['one', 'three', 'two']);
doc = moveLayer(doc, 'ghost', 'up'); // unknown id — no-op
assert.equal(doc.elements.length, 3);

/* Duplicate: appended on top, fresh id, offset placement. */
const dup = duplicateElement(doc, 'one');
assert.equal(dup.elements.length, 4);
const copy = dup.elements[3];
assert.notEqual(copy.id, 'one');
assert.equal(copy.x, doc.elements[0].x + 3);
assert.equal(copy.y, doc.elements[0].y + 3);
assert.equal(duplicateElement(doc, 'ghost').elements.length, 3);
assert.equal(removeElement(dup, copy.id).elements.length, 3);

/* parseDoc at the trust boundary (specs JSON coming back from the server). */
assert.equal(parseDoc(null), null);
assert.equal(parseDoc(''), null);
assert.equal(parseDoc('not json'), null);
assert.equal(parseDoc('{"elements":"nope"}'), null);
assert.equal(parseDoc('{}'), null);

const withText = addElement(createDoc(), text({ text: 'PrinZex', bold: true }));
const roundTrip = parseDoc(serializeDoc(withText));
assert.ok(roundTrip);
assert.equal(roundTrip.elements.length, 1);
assert.deepEqual(roundTrip.elements[0], withText.elements[0]);
assert.equal(roundTrip.background, '#ffffff');

const dirty = parseDoc(
  JSON.stringify({
    background: 42,
    elements: [
      { kind: 'alien', id: 'x' },
      { kind: 'text', id: 'ok', text: 7, fontSize: 900, align: 'sideways', x: NaN },
      { kind: 'image', id: 'no-url' },
      { kind: 'shape', id: 's', shape: 'dodecahedron', w: 10, h: 10 },
    ],
  }),
);
assert.ok(dirty);
assert.equal(dirty.background, '#ffffff');
// alien kind + url-less image dropped; text coerced; shape falls back to rect
assert.equal(dirty.elements.length, 2);
const coercedText = dirty.elements[0] as TextElement;
assert.equal(coercedText.text, 'Text');
assert.equal(coercedText.fontSize, MAX_TEXT_PT);
assert.equal(coercedText.align, 'left');
assert.equal(coercedText.x, 0); // NaN → fallback
assert.equal((dirty.elements[1] as ShapeElement).shape, 'rect');

/* The 100-element cap keeps a hostile doc from wedging the stage. */
const flood = JSON.stringify({
  background: '#fff',
  elements: Array.from({ length: 140 }, (_, i) => ({
    kind: 'shape',
    id: `s${i}`,
    shape: 'rect',
    color: '#000',
    x: 0,
    y: 0,
    w: 5,
    h: 5,
  })),
});
assert.equal(parseDoc(flood)?.elements.length, 100);

/* Template/upload seeding: full-bleed base image covering trim + bleed. */
const seeded = docFromImage('data:image/png;base64,x', 'template t2', STANDARD);
assert.equal(seeded.elements.length, 1);
const seedEl = seeded.elements[0] as ImageElement;
assert.equal(seedEl.kind, 'image');
assert.equal(seedEl.x, -BLEED_MM);
assert.equal(seedEl.y, -BLEED_MM);
assert.equal(seedEl.w, STANDARD.w + 2 * BLEED_MM);
assert.equal(seedEl.h, STANDARD.h + 2 * BLEED_MM);
assert.deepEqual(parseDoc(serializeDoc(seeded))?.elements[0], seedEl);

console.log('card-studio model checks: OK');
