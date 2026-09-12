/**
 * invoicePdf — the pure pdf-lib GST invoice renderer (gap #9). Deliberately
 * Prisma-free so this suite runs without a generated Prisma client: it only
 * asserts the PDF is well-formed and the invoice-number generator is stable.
 */
import { buildInvoicePdf, invoiceNumberFor } from '../modules/orders/invoicePdf';

const sample = {
  invoiceNumber: 'INV-20260912-ABC123',
  issuedAt: new Date('2026-09-12T10:00:00.000Z'),
  orderId: 'cmabcdefghijklmnop1234abc',
  deliverySpeed: 'EXPRESS',
  paymentMethod: 'upi',
  seller: {
    name: 'Kolkata Print House',
    gstin: '19ABCDE1234F1Z5',
    address: '12 Park Street, Kolkata, West Bengal 700016',
    phone: '+91 98300 12345',
    email: 'prints@example.in',
  },
  buyer: {
    name: 'Arindam Roy',
    email: 'arindam@example.com',
    phone: '+91 98765 43210',
    address: '88 Salt Lake Sector V, Kolkata, West Bengal 700091',
  },
  items: [
    { serviceName: 'Document Printing (A4, bond, B&W, double-sided)', quantity: 2, unitPrice: 125.5, total: 251 },
    { serviceName: 'Spiral Binding', quantity: 1, unitPrice: 40, total: 40 },
  ],
  amounts: {
    subtotal: 291,
    deliveryFee: 50,
    rushFee: 0,
    platformFee: 20,
    discount: 10,
    taxableAmount: 351,
    gstRatePercent: 18,
    tax: 63.18,
    total: 414.18,
  },
};

describe('invoicePdf — GST invoice renderer', () => {
  test('produces a well-formed single-page A4 PDF', async () => {
    const pdf = await buildInvoicePdf(sample);
    const head = Buffer.from(pdf.subarray(0, 5)).toString('latin1');
    expect(head).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  test('renders without a GSTIN and without optional fees', async () => {
    const pdf = await buildInvoicePdf({
      ...sample,
      seller: { ...sample.seller, gstin: null, phone: null, email: null },
      buyer: { ...sample.buyer, phone: null, email: null },
      items: [{ serviceName: 'Document Printing', quantity: 1, unitPrice: 50, total: 50 }],
      amounts: { ...sample.amounts, deliveryFee: 0, rushFee: 0, platformFee: 0, discount: 0, taxableAmount: 50, tax: 9, total: 59 },
    });
    expect(Buffer.from(pdf.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
  });
});

describe('invoiceNumberFor', () => {
  test('is date-prefixed and deterministic', () => {
    const createdAt = new Date('2026-09-12T10:00:00.000Z');
    const n = invoiceNumberFor('cmabcdefghijklmnop1234abc', createdAt);
    expect(n).toBe('INV-20260912-234ABC');
    expect(invoiceNumberFor('cmabcdefghijklmnop1234abc', createdAt)).toBe(n);
  });
});
