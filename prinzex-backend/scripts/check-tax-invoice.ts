/**
 * Guard for the tax/invoice story (gap #9): GST must apply to the
 * server-decided taxable base (subtotal, plus delivery/rush/platform fees by
 * default), every order must freeze the GST base + rate for its invoice, and
 * customers must be able to download a server-rendered GST invoice PDF.
 *
 *   · taxation.ts is the ONLY taxable-value math, and both toggle states are
 *     correct (composite supply default, subtotal-only when gstOnFees=false)
 *   · platformSettings.ts carries the gstOnFees toggle with a taxable default
 *   · orders.helpers.ts computeQuote returns taxableAmount + gstOnFees
 *   · orders.service.ts passes gstOnFees into every quote and persists the
 *     GST snapshot on the order
 *   · the Order model/migration carry taxableAmount + gstRatePercent
 *   · GET /api/orders/:orderId/invoice streams a pdf-lib GST invoice
 *
 * Run from the backend root: npx tsx scripts/check-tax-invoice.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gstAmount, gstTaxableAmount } from '../src/modules/orders/taxation';
import { PLATFORM_SETTING_DEFAULTS, platformValuesFromMetadata } from '../src/utils/platformSettings';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

// ── taxation.ts is the single source of taxable-value truth ────────────────
const base = { subtotal: 100, rushFee: 10, deliveryFee: 20, platformFee: 5 };
assert.equal(gstTaxableAmount({ ...base, gstOnFees: true }), 135, 'fees taxable by default');
assert.equal(gstTaxableAmount({ ...base, gstOnFees: false }), 100, 'subtotal-only when toggled off');
assert.equal(gstAmount(135, 0.18), 24.3);
assert.equal(gstAmount(100, 0.05), 5);

// ── the settings toggle defaults to the composite-supply decision ─────────
assert.equal(PLATFORM_SETTING_DEFAULTS.gstOnFees, true);
assert.equal(platformValuesFromMetadata({}).gstOnFees, true);
assert.equal(platformValuesFromMetadata({ gstOnFees: false }).gstOnFees, false);

// ── computeQuote exposes the richer breakdown ─────────────────────────────
const helpers = read('src/modules/orders/orders.helpers.ts');
assert.ok(helpers.includes('gstTaxableAmount({'), 'computeQuote must derive taxable value via taxation.ts');
assert.ok(helpers.includes('gstAmount(taxableAmount'), 'computeQuote must derive tax via taxation.ts');
assert.ok(helpers.includes('taxableAmount,\n    gstOnFees,'), 'computeQuote must RETURN taxableAmount and gstOnFees');

// ── order placement passes the toggle and freezes the GST snapshot ────────
const service = read('src/modules/orders/orders.service.ts');
const onFeesCalls = service.match(/gstOnFees: platformValues\.gstOnFees,/g) ?? [];
assert.equal(onFeesCalls.length, 2, 'quote + order paths must both pass gstOnFees');
assert.ok(service.includes('taxableAmount: quote.taxableAmount,'), 'order row must persist the taxable base');
assert.ok(service.includes('gstRatePercent: platformValues.gstRatePercent,'), 'order row must persist the GST rate');

// ── Order model + migration carry the snapshot columns ────────────────────
const schema = read('prisma/schema.prisma');
assert.ok(schema.includes('taxableAmount     Decimal'), 'Order.taxableAmount missing from schema');
assert.ok(schema.includes('gstRatePercent    Decimal'), 'Order.gstRatePercent missing from schema');
const migrations = join(__dirname, '..', 'prisma', 'migrations');
const snapshotMigration = join(migrations, '20260912000000_order_gst_taxable_amount', 'migration.sql');
assert.ok(existsSync(snapshotMigration), 'GST snapshot migration missing');
const migrationSql = readFileSync(snapshotMigration, 'utf8');
assert.ok(migrationSql.includes('"taxableAmount"'), 'migration must add taxableAmount');
assert.ok(migrationSql.includes('"gstRatePercent"'), 'migration must add gstRatePercent');

// ── customer invoice download is wired (route → controller → renderer) ────
const routes = read('src/modules/orders/orders.routes.ts');
assert.ok(routes.includes('/:orderId/invoice'), 'invoice route missing');
const controller = read('src/modules/orders/orders.controller.ts');
assert.ok(controller.includes('downloadInvoice'), 'invoice controller missing');
assert.ok(controller.includes("application/pdf"), 'invoice must stream as PDF');
const invoice = read('src/modules/orders/invoice.ts');
assert.ok(invoice.includes('getOrderInvoice'), 'invoice loader missing');
assert.ok(invoice.includes('taxableAmount: Number(order.taxableAmount)'), 'invoice must read the GST snapshot');
const invoicePdf = read('src/modules/orders/invoicePdf.ts');
assert.ok(invoicePdf.includes('buildInvoicePdf'), 'invoice renderer missing');
assert.ok(invoicePdf.includes('invoiceNumberFor'), 'invoice-number generator missing');
assert.ok(invoicePdf.includes('GSTIN'), 'invoice must carry the seller GSTIN');

console.log('check-tax-invoice: all checks passed ✓');
