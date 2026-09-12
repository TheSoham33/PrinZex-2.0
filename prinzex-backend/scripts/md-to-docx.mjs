/**
 * Regenerates docs/PROJECT-DOCUMENTATION.docx from docs/PROJECT-DOCUMENTATION.md
 * (the Markdown is the source of truth — edit it, then re-run).
 *
 * Supports the md subset used by the doc: headings, paragraphs, bullets,
 * numbered items, pipe tables, fenced code blocks, **bold** and `code`.
 *
 *   node scripts/md-to-docx.mjs        (from prinzex-backend)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AlignmentType, Document, HeadingLevel, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

const MD = new URL('../../docs/PROJECT-DOCUMENTATION.md', import.meta.url);
const OUT = new URL('../../docs/PROJECT-DOCUMENTATION.docx', import.meta.url);
const lines = readFileSync(MD, 'utf8').split('\n');

/** Inline md → TextRun[]: handles **bold** and `code`. */
function runs(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  for (const part of text.split(re)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    else if (part.startsWith('`')) out.push(new TextRun({ text: part.slice(1, -1), font: 'Consolas' }));
    else out.push(new TextRun(part));
  }
  return out;
}

const children = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  // fenced code block
  if (line.startsWith('```')) {
    const block = [];
    for (i++; i < lines.length && !lines[i].startsWith('```'); i++) block.push(lines[i]);
    i++;
    children.push(new Paragraph({ spacing: { before: 120 } }));
    for (const codeLine of block) {
      children.push(new Paragraph({
        children: [new TextRun({ text: codeLine || ' ', font: 'Consolas', size: 15 })],
        shading: { type: ShadingType.CLEAR, fill: 'F4F4F5' },
        spacing: { after: 0 },
      }));
    }
    children.push(new Paragraph({ spacing: { after: 120 } }));
    continue;
  }

  // table
  if (line.trim().startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells); // skip |---| separator
      i++;
    }
    const width = Math.floor(10000 / rows[0].length);
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map((cells, r) => new TableRow({
        tableHeader: r === 0,
        children: cells.map((cell) => new TableCell({
          width: { size: width, type: WidthType.DXA },
          shading: r === 0 ? { type: ShadingType.CLEAR, fill: 'E2E8F0' } : undefined,
          children: [new Paragraph({
            children: r === 0
              ? [new TextRun({ text: cell.replace(/\*\*/g, ''), bold: true })]
              : runs(cell),
          })],
        })),
      })),
    }));
    children.push(new Paragraph({}));
    continue;
  }

  // headings
  const h = line.match(/^(#{1,4})\s+(.*)/);
  if (h) {
    children.push(new Paragraph({
      children: [new TextRun({ text: h[2].replace(/\*\*/g, ''), bold: true })],
      heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][h[1].length - 1],
      spacing: { before: 240, after: 120 },
    }));
    i++;
    continue;
  }

  // horizontal rule / blank
  if (/^-{3,}\s*$/.test(line.trim()) || line.trim() === '') { i++; continue; }

  // bullets & numbered items
  const bullet = line.match(/^(\s*)[-*]\s+(.*)/) || line.match(/^(\s*)\d+\.\s+(.*)/);
  if (bullet) {
    const text = /^\s*\d+\./.test(line) ? line.trim() : bullet[2];
    children.push(new Paragraph({
      children: runs(text),
      bullet: /^\s*\d+\./.test(line) ? undefined : { level: Math.floor(bullet[1].length / 2) },
      spacing: { after: 60 },
    }));
    i++;
    continue;
  }

  // paragraph
  children.push(new Paragraph({ children: runs(line), spacing: { after: 120 } }));
  i++;
}

const doc = new Document({
  creator: 'PrinZex team',
  title: 'PrinZex 2.0 — Project Documentation',
  sections: [{ children }],
});
children.unshift(); // no-op guard for empty docs

writeFileSync(OUT, await Packer.toBuffer(doc));
const kb = (readFileSync(OUT).length / 1024).toFixed(1);
console.log(`OK: docs/PROJECT-DOCUMENTATION.docx regenerated from markdown (${kb} KB, ${children.length} blocks).`);
