/**
 * computeQuote — the pure, deterministic quote core every order price flows
 * through. Jest bootstrap for gap 5: the pricing branches (per-page, duplex
 * sheet math, binding incl. spiral/twin-loop customizations, slabs,
 * per-piece, photo prints), the seller pricing-override precedence, the
 * scoped add-ons (stapling doc-print-only, lamination film lam-film-only),
 * fee/GST/commission/platform-fee arithmetic, and the spine/twin-loop
 * physical estimates. Companion of the runnable check scripts.
 */
import {
  colorPageSplit,
  computeQuote,
  countColorPages,
  countDuplexColorSheets,
  type QuoteComputationInput,
  type QuoteSpecifications,
} from '../modules/orders/orders.helpers';

/** A Document Printing quote: ₹5/page B&W, ₹10/page colour, 10 pages. */
const docPrint = (over: Partial<QuoteComputationInput> = {}): QuoteComputationInput => ({
  basePrice: 5,
  unit: 'per page',
  categoryId: 'documents',
  serviceId: 'doc-print',
  quantity: 1,
  specifications: {
    paperType: 'bond',
    size: 'A4',
    colorOption: 'bw',
    totalPages: 10,
  },
  deliverySpeed: 'STANDARD',
  commissionRate: 0.1,
  discount: 0,
  ...over,
});

const specs = (over: Partial<QuoteSpecifications> = {}): QuoteSpecifications => ({
  paperType: 'bond',
  size: 'A4',
  colorOption: 'bw',
  totalPages: 10,
  ...over,
});

describe('computeQuote — per-page services (Document Printing)', () => {
  test('B&W pages at the base per-page rate (GST on top, commission off subtotal)', () => {
    const quote = computeQuote(docPrint());
    expect(quote.subtotal).toBe(50); // 5 × 10
    expect(quote.tax).toBe(9); // 18% GST
    expect(quote.commissionAmount).toBe(5); // 10% of subtotal
    expect(quote.rushFee).toBe(0); // rush fees are currently ₹0 across speeds
    expect(quote.deliveryFee).toBe(0); // STANDARD default
    expect(quote.total).toBe(59);
    expect(quote.pageCost).toBeUndefined(); // per-page branch does not split page/binding
    expect(quote.bindingCost).toBeUndefined();
  });

  test('colour option prices every page at 2× the B&W rate', () => {
    const quote = computeQuote(docPrint({ specifications: specs({ colorOption: 'color' }) }));
    expect(quote.subtotal).toBe(100); // 10 × 10
    expect(quote.total).toBe(118);
  });

  test('mixed colour option prices only the requested pages', () => {
    const quote = computeQuote(
      docPrint({ specifications: specs({ colorOption: 'mixed', colorPages: '1,3-4' }) }),
    );
    expect(quote.subtotal).toBe(65); // 5×7 B&W + 10×3 colour
    expect(quote.total).toBe(76.7);
  });

  test('duplex bills per physical sheet (10 pages → 5 sheets)', () => {
    const quote = computeQuote(
      docPrint({ specifications: specs({ printSides: 'double' }) }),
    );
    expect(quote.subtotal).toBe(25); // 5 × 5 sheets
    expect(quote.billablePages).toBe(5);
    expect(quote.total).toBe(29.5);
  });

  test('duplex + mixed counts colour SHEETS, not colour pages', () => {
    const allColour = computeQuote(
      docPrint({
        specifications: specs({ printSides: 'double', colorOption: 'mixed', colorPages: '1-10' }),
      }),
    );
    expect(allColour.subtotal).toBe(50); // every sheet carries colour → 10 × 5
    expect(allColour.billablePages).toBe(5);

    const firstSheetOnly = computeQuote(
      docPrint({
        specifications: specs({ printSides: 'double', colorOption: 'mixed', colorPages: '1' }),
      }),
    );
    expect(firstSheetOnly.subtotal).toBe(30); // 5×4 B&W sheets + 10×1 colour sheet
  });

  test('quantity multiplies the page cost', () => {
    const quote = computeQuote(docPrint({ quantity: 3 }));
    expect(quote.subtotal).toBe(150);
  });
});

describe('computeQuote — seller pricing overrides', () => {
  test('seller pageRate wins over the service base price', () => {
    const quote = computeQuote(
      docPrint({
        sellerMetadata: { pricingOverrides: { pageRate: { bw: 2, color: 4 } } },
        specifications: specs({ colorOption: 'color' }),
      }),
    );
    expect(quote.subtotal).toBe(40); // 4 × 10
  });

  test('legacy colorOption add-ons are the fallback when pageRate is absent', () => {
    const quote = computeQuote(
      docPrint({
        sellerMetadata: { pricingOverrides: { colorOption: { bw: 3, color: 6 } } },
        specifications: specs({ colorOption: 'color' }),
      }),
    );
    expect(quote.subtotal).toBe(60); // 6 × 10
  });

  test('paper type/size extras add to both B&W and colour rates', () => {
    const quote = computeQuote(
      docPrint({
        sellerMetadata: {
          pricingOverrides: {
            servicePaperOptions: {
              'doc-print': { paperTypes: { bond: 2 }, paperSizes: { A4: 1 } },
            },
          },
        },
      }),
    );
    expect(quote.subtotal).toBe(80); // (5 + 3) × 10
  });

  test('stapling: seller price wins, else platform default; loose is free', () => {
    const corner = computeQuote(
      docPrint({ specifications: specs({ stapling: 'corner-stapling' }) }),
    );
    expect(corner.subtotal).toBe(55); // 50 + ₹5 default
    const side = computeQuote(docPrint({ specifications: specs({ stapling: 'side-stapling' }) }));
    expect(side.subtotal).toBe(60); // 50 + ₹10 default
    const loose = computeQuote(docPrint({ specifications: specs({ stapling: 'loose' }) }));
    expect(loose.subtotal).toBe(50);
    const sellerPriced = computeQuote(
      docPrint({
        sellerMetadata: { pricingOverrides: { staplingOptions: { 'corner-stapling': 7 } } },
        specifications: specs({ stapling: 'corner-stapling' }),
      }),
    );
    expect(sellerPriced.subtotal).toBe(57); // 50 + ₹7 seller price
  });

  test('lamination film surcharges per sheet; micron-80 is free', () => {
    const film = (thickness: string, seller?: Record<string, number>) =>
      computeQuote(
        docPrint({
          serviceId: 'lam-film',
          sellerMetadata: seller
            ? { pricingOverrides: { filmThicknessOptions: seller } }
            : undefined,
          specifications: specs({ filmThickness: thickness }),
        }),
      );
    expect(film('micron-125').subtotal).toBe(70); // 50 + 2 × 10 sheets
    expect(film('micron-80').subtotal).toBe(50);
    expect(film('micron-250', { 'micron-250': 3 }).subtotal).toBe(80); // seller ₹3 × 10
  });

  test('add-ons are scoped: stapling never leaks off doc-print, film never leaks off lam-film', () => {
    const quote = computeQuote(
      docPrint({
        serviceId: 'lam-film',
        specifications: specs({ stapling: 'corner-stapling', filmThickness: 'micron-125' }),
      }),
    );
    expect(quote.subtotal).toBe(70); // film only — the stapling spec is inert here
  });
});

describe('computeQuote — binding services', () => {
  const binding = (over: Partial<QuoteComputationInput> = {}): QuoteComputationInput => ({
    basePrice: 60, // per document, never a page rate
    unit: 'per document',
    categoryId: 'binding',
    serviceId: 'bind-spiral',
    quantity: 1,
    commissionRate: 0.1,
    discount: 0,
    deliverySpeed: 'STANDARD',
    pageRateFallback: 2, // seller's cheapest per-page rate
    specifications: specs(),
    ...over,
  });

  test('pages priced at the fallback rate + per-document base binding', () => {
    const quote = computeQuote(binding());
    expect(quote.pageCost).toBe(20); // 2 × 10
    expect(quote.bindingCost).toBe(60);
    expect(quote.subtotal).toBe(80);
    expect(quote.total).toBe(94.4); // + 18% GST
  });

  test('spiral customizations (cover type + coil + cover colour) add to the binding rate', () => {
    const quote = computeQuote(
      binding({
        specifications: specs({ coverType: 'pvc', spiralType: 'coil-x', coverColor: 'black' }),
        sellerMetadata: {
          pricingOverrides: {
            coverType: { pvc: 10 },
            coilType: { 'coil-x': 5 },
            coverColor: { black: 3 },
          },
        },
      }),
    );
    expect(quote.bindingCost).toBe(78); // 60 + 18
    expect(quote.subtotal).toBe(98);
  });

  test('spiral customizations never leak onto other binding services', () => {
    const quote = computeQuote(
      binding({
        serviceId: 'bind-hard',
        specifications: specs({ coverType: 'pvc' }),
        sellerMetadata: { pricingOverrides: { coverType: { pvc: 10 } } },
      }),
    );
    expect(quote.bindingCost).toBe(60); // hard binding: availability-only
  });

  test('twin-loop: embedded covers bill inner pages; wire/pitch/size derived from sheets', () => {
    const quote = computeQuote(
      binding({
        serviceId: 'bind-twin-loop',
        specifications: specs({
          totalPages: 12,
          twinLoopCoverSubmission: 'embedded',
          twinLoopWireColor: 'black',
          twinLoopFrontCover: 'clear',
          twinLoopCalendarHanger: true,
        }),
        sellerMetadata: {
          pricingOverrides: {
            twinLoopOptions: { wireColors: { black: 12 }, frontCovers: { clear: 8 }, hangerPrice: 20 },
          },
        },
      }),
    );
    // inner pages = 12 − 2 covers → 10 pages @ ₹2 + binding 60 + wire 12 + cover 8 + hanger 20
    expect(quote.pageCost).toBe(20);
    expect(quote.bindingCost).toBe(100);
    expect(quote.subtotal).toBe(120);
    expect(quote.twinLoopTotalSheets).toBe(12); // 10 inner + 2 covers
    expect(quote.twinLoopPitch).toBe('3:1'); // ≤ 120 inner pages
    expect(quote.twinLoopWireSize).toBe('1/4"'); // 12 × 0.1 + 0.6 = 1.8 mm
  });

  test('twin-loop duplex halves the inner sheets; big jobs cross to 2:1 pitch and thicker wire', () => {
    const quote = computeQuote(
      binding({
        serviceId: 'bind-twin-loop',
        specifications: specs({
          totalPages: 300,
          twinLoopCoverSubmission: 'embedded',
          twinLoopPrintSides: 'double',
        }),
      }),
    );
    // Duplex puts two PDF pages on one physical sheet and the inner-page
    // charge follows the SHEET count: ceil(298 / 2) = 149 sheets @ ₹2.
    expect(quote.pageCost).toBe(298);
    expect(quote.subtotal).toBe(358); // + 60 binding
    expect(quote.billablePages).toBe(149);
    expect(quote.twinLoopTotalSheets).toBe(151);
    expect(quote.twinLoopPitch).toBe('2:1'); // 298 inner pages > 120
    expect(quote.twinLoopWireSize).toBe('3/4"'); // 151 × 0.1 + 0.6 = 15.7 mm
  });

  test('spine width: minimum spine per binding type; 100 GSM is thicker (except fixed-caliper tape/glue)', () => {
    const hard = computeQuote(
      binding({ serviceId: 'bind-hard', specifications: specs({ totalPages: 100, paperGsm: 75 }) }),
    );
    expect(hard.spineWidthMm).toBe(5); // max(2, 50 sheets × 0.1)
    const hardThickPaper = computeQuote(
      binding({ serviceId: 'bind-hard', specifications: specs({ totalPages: 100, paperGsm: 100 }) }),
    );
    expect(hardThickPaper.spineWidthMm).toBe(6.5); // max(2, 50 × 0.13)
    const tape = computeQuote(
      binding({ serviceId: 'bind-tape', specifications: specs({ totalPages: 20 }) }),
    );
    expect(tape.spineWidthMm).toBe(4); // max(4, 10 × 0.1) — tape grips ≥ 4 mm
    // Tape and Glue (perfect) Binding always use the standard caliper —
    // their spines have no paper-thickness option, so 100 GSM is ignored.
    const perfect = computeQuote(
      binding({
        serviceId: 'bind-perfect',
        specifications: specs({ totalPages: 100, paperGsm: 100 }),
      }),
    );
    expect(perfect.spineWidthMm).toBe(5); // max(3, 50 × 0.1)
    expect(computeQuote(docPrint()).spineWidthMm).toBeUndefined(); // non-binding
  });
});

describe('computeQuote — slab, per-piece and photo branches', () => {
  test('slab-priced service (Business Cards): the tier rate replaces the base price', () => {
    const quote = computeQuote(
      docPrint({
        unit: 'per piece',
        categoryId: 'business-cards',
        serviceId: 'biz-cards',
        quantity: 500,
        specifications: specs({ totalPages: 0 }),
        sellerMetadata: {
          pricingOverrides: {
            quantitySlabs: {
              'biz-cards': [
                { qty: 1000, rate: 2.5 },
                { qty: 100, rate: 4 },
                { qty: 250, rate: 3.5 },
                { qty: 500, rate: 3 },
              ],
            },
          },
        },
      }),
    );
    expect(quote.subtotal).toBe(1500); // 500 × ₹3 (the 500 tier)
  });

  test('per-piece service: (base + paper extra) × quantity', () => {
    const quote = computeQuote(
      docPrint({
        unit: 'per piece',
        serviceId: 'mug-print',
        basePrice: 50,
        quantity: 3,
        specifications: specs({ totalPages: 0, paperType: 'matte' }),
        sellerMetadata: {
          pricingOverrides: {
            servicePaperOptions: { 'mug-print': { paperTypes: { matte: 5 } } },
          },
        },
      }),
    );
    expect(quote.subtotal).toBe(165); // (50 + 5) × 3
  });

  test('photo prints: platform default = per-photo rate × count; seller combo wins', () => {
    const platform = computeQuote(
      docPrint({
        unit: 'per sheet',
        categoryId: 'photo',
        serviceId: 'spec-photo-prints',
        basePrice: 10, // must be ignored — photo branch is evaluated first
        quantity: 2,
        specifications: specs({ totalPages: 0, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 8 }),
      }),
    );
    expect(platform.subtotal).toBe(192); // ₹12/photo × 8 × 2 sheets

    const sellerCombo = computeQuote(
      docPrint({
        unit: 'per sheet',
        categoryId: 'photo',
        serviceId: 'spec-photo-prints',
        quantity: 1,
        specifications: specs({ totalPages: 0, colorOption: 'color', photoType: 'passport-photo', photosPerSheet: 12 }),
        sellerMetadata: {
          pricingOverrides: { photoTypeOptions: { 'passport-photo': { '12': 150 } } },
        },
      }),
    );
    expect(sellerCombo.subtotal).toBe(150);
  });
});

describe('computeQuote — fees, GST, commission, platform fee, discount', () => {
  test('admin-configured delivery fees override the defaults', () => {
    const quote = computeQuote(
      docPrint({
        deliverySpeed: 'EXPRESS',
        deliveryFees: { STANDARD: 10, EXPRESS: 20, SAME_DAY: 30, PICKUP: 0 },
        gstRate: 0.05,
        commissionRate: 0.15,
      }),
    );
    expect(quote.deliveryFee).toBe(20);
    expect(quote.gstOnFees).toBe(true); // default policy: fees taxable
    expect(quote.taxableAmount).toBe(70); // 50 + 20 delivery
    expect(quote.tax).toBe(3.5); // 5% of the composite supply (50 + 20)
    expect(quote.commissionAmount).toBe(7.5);
    expect(quote.total).toBe(73.5); // 50 + 20 + 3.5
  });

  test('gstOnFees:false keeps GST on the subtotal only (gap #9 toggle)', () => {
    const quote = computeQuote(
      docPrint({ deliverySpeed: 'EXPRESS', platformFee: 20, gstOnFees: false }),
    );
    expect(quote.deliveryFee).toBe(50); // default EXPRESS fee
    expect(quote.gstOnFees).toBe(false);
    expect(quote.taxableAmount).toBe(50); // fees excluded from the base
    expect(quote.tax).toBe(9); // 18% of 50
    expect(quote.total).toBe(129); // 50 + 50 + 9 + 20
  });

  test('platform fee rides on top after the discount; discount never exceeds the subtotal', () => {
    const quote = computeQuote(
      docPrint({ deliverySpeed: 'EXPRESS', discount: 10, platformFee: 20 }),
    );
    expect(quote.deliveryFee).toBe(50); // default EXPRESS fee
    expect(quote.discount).toBe(10);
    expect(quote.platformFee).toBe(20);
    expect(quote.taxableAmount).toBe(120); // 50 + 50 delivery + 20 platform fee
    expect(quote.tax).toBe(21.6); // 18% of 120
    expect(quote.total).toBe(131.6); // 50 + 50 + 21.6 − 10 + 20
  });
});

describe('colour page arithmetic (pure helpers)', () => {
  test('countColorPages parses singles, ranges, dedupes and clamps to the document', () => {
    expect(countColorPages('1, 5, 10-15', 12)).toBe(5); // 1, 5, 10–12
    expect(countColorPages('8-20', 10)).toBe(3); // 8, 9, 10
    expect(countColorPages('1,1,2', 10)).toBe(2); // dedupe
    expect(countColorPages('', 10)).toBe(0);
    expect(countColorPages(undefined, 10)).toBe(0);
  });

  test('colorPageSplit follows the selected colour option', () => {
    expect(colorPageSplit('color', undefined, 10)).toEqual({ bwPages: 0, colorPages: 10 });
    expect(colorPageSplit('bw', undefined, 10)).toEqual({ bwPages: 10, colorPages: 0 });
    expect(colorPageSplit('mixed', '2-4', 10)).toEqual({ bwPages: 7, colorPages: 3 });
    expect(colorPageSplit('mixed', '1-99', 10)).toEqual({ bwPages: 0, colorPages: 10 }); // clamped
    expect(colorPageSplit('mixed', undefined, 10)).toEqual({ bwPages: 10, colorPages: 0 });
  });

  test('countDuplexColorSheets counts sheets carrying ≥ 1 colour page', () => {
    expect(countDuplexColorSheets('1-3', 10)).toBe(2); // sheets 1 and 2
    expect(countDuplexColorSheets('2', 10)).toBe(1);
    expect(countDuplexColorSheets('5-6', 10)).toBe(1); // both pages share sheet 3
    expect(countDuplexColorSheets(undefined, 10)).toBe(0);
  });
});
