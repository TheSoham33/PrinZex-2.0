import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Pure GST invoice PDF renderer (gap #9 — tax/invoice story), dependency-free
 * beyond pdf-lib so jest and the check scripts can exercise it without a
 * generated Prisma client. `invoice.ts` loads the order and feeds this module.
 *
 * Rendered in-process with pdf-lib (already a dependency — see utils/pdf.ts)
 * rather than Gotenberg: the sidecar's Chromium HTML/URL routes are DISABLED
 * on purpose (`--chromium-disable-routes=true` in docker-compose.yml) to keep
 * the SSRF surface closed, so the only Gotenberg route available is
 * LibreOffice conversion. An in-process renderer means the invoice works with
 * zero sidecars, offline, and is trivially reproducible.
 *
 * The document is rebuilt from the ORDER ROW each time (never cached to
 * disk), using the GST snapshot columns (taxableAmount / gstRatePercent)
 * frozen at placement — so the invoice always matches what the customer paid,
 * even if the admin retunes the GST rate or the fee-taxability toggle later.
 */

export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: Date;
  orderId: string;
  deliverySpeed: string;
  paymentMethod: string;
  seller: {
    name: string;
    gstin: string | null;
    address: string;
    phone: string | null;
    email: string | null;
  };
  buyer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string;
  };
  items: { serviceName: string; quantity: number; unitPrice: number; total: number }[];
  amounts: {
    subtotal: number;
    deliveryFee: number;
    rushFee: number;
    platformFee: number;
    discount: number;
    taxableAmount: number;
    gstRatePercent: number;
    tax: number;
    total: number;
  };
}

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const BODY_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.15, 0.39, 0.86);
const LIGHT_FILL = rgb(0.95, 0.96, 0.98);

// "Rs." not "₹": the embedded standard fonts are WinAnsi-encoded and cannot
// render the U+20B9 rupee sign; "Rs." is the standard ASCII-safe alternative.
const money = (n: number) => `Rs. ${n.toFixed(2)}`;

/** Split a line into wrapped lines that fit `maxWidth` at `size`. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || line === '') {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface RenderCtx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function drawWrapped(ctx: RenderCtx, text: string, x: number, size: number, maxWidth: number, color = INK, lineGap = 4): void {
  const lines = wrap(text, ctx.font, size, maxWidth);
  for (const line of lines) {
    ctx.page.drawText(line, { x, y: ctx.y, size, font: ctx.font, color });
    ctx.y -= size + lineGap;
  }
}

function drawBlockLabel(ctx: RenderCtx, label: string, x: number, size = 9): void {
  ctx.page.drawText(label.toUpperCase(), { x, y: ctx.y, size, font: ctx.bold, color: ACCENT });
  ctx.y -= size + 6;
}

export async function buildInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: RenderCtx = { page, font, bold, y: PAGE_HEIGHT - MARGIN };

  // ── Header ──────────────────────────────────────────────────────────────
  page.drawText('PrinZex', { x: MARGIN, y: ctx.y, size: 20, font: bold, color: ACCENT });
  page.drawText('TAX INVOICE', { x: MARGIN, y: ctx.y - 24, size: 13, font: bold, color: INK });
  ctx.y -= 46;
  // Right-aligned invoice meta.
  const metaRight = PAGE_WIDTH - MARGIN;
  const drawMeta = (label: string, value: string, size = 9) => {
    const w = font.widthOfTextAtSize(`${label}: ${value}`, size);
    page.drawText(`${label}: ${value}`, { x: metaRight - w, y: ctx.y, size, font, color: MUTED });
    ctx.y -= size + 4;
  };
  drawMeta('Invoice no', data.invoiceNumber);
  drawMeta('Date', data.issuedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  drawMeta('Order', data.orderId.slice(-8).toUpperCase());

  ctx.y -= 14;
  page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 1.5, color: ACCENT });
  ctx.y -= 24;

  // ── From / Bill To ──────────────────────────────────────────────────────
  const colW = BODY_WIDTH / 2 - 12;
  const rightColX = MARGIN + colW + 24;
  const colTop = ctx.y;
  drawBlockLabel(ctx, 'Sold by', MARGIN);
  drawWrapped(ctx, data.seller.name, MARGIN, 10, colW, INK, 3);
  drawWrapped(ctx, data.seller.address, MARGIN, 9, colW, MUTED, 3);
  if (data.seller.gstin) drawWrapped(ctx, `GSTIN: ${data.seller.gstin}`, MARGIN, 9, colW, MUTED, 3);
  if (data.seller.phone) drawWrapped(ctx, data.seller.phone, MARGIN, 9, colW, MUTED, 3);
  if (data.seller.email) drawWrapped(ctx, data.seller.email, MARGIN, 9, colW, MUTED, 3);
  const leftBottom = ctx.y;

  ctx.y = colTop;
  drawBlockLabel(ctx, 'Billed to', rightColX);
  drawWrapped(ctx, data.buyer.name, rightColX, 10, colW, INK, 3);
  drawWrapped(ctx, data.buyer.address, rightColX, 9, colW, MUTED, 3);
  if (data.buyer.phone) drawWrapped(ctx, data.buyer.phone, rightColX, 9, colW, MUTED, 3);
  if (data.buyer.email) drawWrapped(ctx, data.buyer.email, rightColX, 9, colW, MUTED, 3);

  // Continue below whichever column ran longer.
  ctx.y = Math.min(leftBottom, ctx.y) - 28;

  // ── Items table ─────────────────────────────────────────────────────────
  const tableTop = ctx.y;
  page.drawRectangle({ x: MARGIN, y: tableTop - 18, width: BODY_WIDTH, height: 18, color: LIGHT_FILL });
  const cols = { name: MARGIN + 6, qty: MARGIN + BODY_WIDTH - 190, price: MARGIN + BODY_WIDTH - 120, amt: PAGE_WIDTH - MARGIN - 6 };
  const headerY = tableTop - 18 + 5;
  page.drawText('ITEM', { x: cols.name, y: headerY, size: 8, font: bold, color: MUTED });
  page.drawText('QTY', { x: cols.qty, y: headerY, size: 8, font: bold, color: MUTED });
  page.drawText('UNIT', { x: cols.price, y: headerY, size: 8, font: bold, color: MUTED });
  page.drawText('AMOUNT', { x: cols.amt - font.widthOfTextAtSize('AMOUNT', 8), y: headerY, size: 8, font: bold, color: MUTED });

  ctx.y = tableTop - 30;
  const itemMaxWidth = cols.qty - cols.name - 10;
  for (const item of data.items) {
    const wrapped = wrap(item.serviceName, font, 9, itemMaxWidth);
    const rowHeight = Math.max(16, wrapped.length * 12 + 6);
    ctx.y -= rowHeight - 16;
    const textY = ctx.y + rowHeight - 12;
    for (const line of wrapped) {
      page.drawText(line, { x: cols.name, y: textY - wrapped.indexOf(line) * 12, size: 9, font, color: INK });
    }
    page.drawText(String(item.quantity), { x: cols.qty, y: textY, size: 9, font, color: INK });
    page.drawText(money(item.unitPrice), { x: cols.price, y: textY, size: 9, font, color: INK });
    const amtW = font.widthOfTextAtSize(money(item.total), 9);
    page.drawText(money(item.total), { x: cols.amt - amtW, y: textY, size: 9, font, color: INK });
    ctx.y -= rowHeight;
    page.drawLine({ start: { x: MARGIN, y: ctx.y + 6 }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y + 6 }, thickness: 0.5, color: LIGHT_FILL });
    ctx.y -= 6;
  }

  // ── Totals ──────────────────────────────────────────────────────────────
  ctx.y -= 14;
  const a = data.amounts;
  const rows: { label: string; value: number; negative?: boolean; strong?: boolean }[] = [
    { label: 'Subtotal', value: a.subtotal },
    ...(a.deliveryFee > 0 ? [{ label: 'Delivery fee', value: a.deliveryFee }] : []),
    ...(a.rushFee > 0 ? [{ label: 'Rush fee', value: a.rushFee }] : []),
    ...(a.platformFee > 0 ? [{ label: 'Platform fee', value: a.platformFee }] : []),
    ...(a.discount > 0 ? [{ label: 'Discount', value: a.discount, negative: true }] : []),
    { label: 'Taxable value', value: a.taxableAmount },
    { label: `GST @ ${a.gstRatePercent}%`, value: a.tax },
  ];
  const rightX = PAGE_WIDTH - MARGIN;
  for (const row of rows) {
    const labelX = MARGIN + 6;
    const valueText = (row.negative ? '-' : '') + money(row.value);
    const valueW = font.widthOfTextAtSize(valueText, 9);
    page.drawText(row.label, { x: labelX, y: ctx.y, size: 9, font, color: row.strong ? INK : MUTED });
    page.drawText(valueText, { x: rightX - valueW, y: ctx.y, size: 9, font: row.strong ? bold : font, color: INK });
    ctx.y -= 15;
  }
  ctx.y -= 4;
  page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: rightX, y: ctx.y }, thickness: 1, color: INK });
  ctx.y -= 16;
  const totalText = money(a.total);
  const totalW = bold.widthOfTextAtSize(totalText, 13);
  page.drawText('Total (INR)', { x: MARGIN + 6, y: ctx.y, size: 11, font: bold, color: INK });
  page.drawText(totalText, { x: rightX - totalW, y: ctx.y - 2, size: 13, font: bold, color: ACCENT });

  // ── Footer ──────────────────────────────────────────────────────────────
  ctx.y -= 34;
  page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: rightX, y: ctx.y }, thickness: 0.5, color: LIGHT_FILL });
  ctx.y -= 16;
  page.drawText('This is a computer-generated invoice and does not require a physical signature.', { x: MARGIN, y: ctx.y, size: 8, font, color: MUTED });
  ctx.y -= 12;
  page.drawText(`Delivery: ${data.deliverySpeed} · Payment: ${data.paymentMethod} · Amounts in Indian Rupees (INR)`, { x: MARGIN, y: ctx.y, size: 8, font, color: MUTED });

  return doc.save();
}

export function invoiceNumberFor(orderId: string, createdAt: Date): string {
  const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${ymd}-${orderId.slice(-6).toUpperCase()}`;
}
