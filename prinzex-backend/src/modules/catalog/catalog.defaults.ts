/**
 * Default catalogue content — mirrors the previously hard-coded frontend
 * constants. Inserted lazily for any missing group key so an upgraded
 * database starts out behaving exactly like the static build; admins then
 * edit rows from the dashboard and every surface follows the database.
 */

export interface CatalogGroupDefault {
  label: string;
  data: unknown[];
}

export const DEFAULT_CATALOG: Record<string, CatalogGroupDefault> = {
  'service-categories': {
    label: 'Service categories',
    data: [
      {
        id: 'documents',
        name: 'Documents',
        description: 'Everyday printing and photocopying',
        services: [
          { id: 'doc-print', name: 'Document Printing' },
          { id: 'doc-xerox', name: 'Photocopy / Xerox' },
        ],
      },
      {
        id: 'bulk',
        name: 'Bulk printing',
        description: 'High-volume jobs at wholesale rates',
        services: [
          { id: 'bulk-booklets', name: 'Booklets & Manuals' },
          { id: 'bulk-brochures', name: 'Brouchers' },
          { id: 'bulk-flyers', name: 'Flyers & Pamphlets' },
        ],
      },
      {
        id: 'cards',
        name: 'Cards',
        description: 'Business cards and card printing',
        services: [{ id: 'cards-business', name: 'Business Cards' }],
      },
      {
        id: 'packaging',
        name: 'Packaging & labels',
        description: 'Product labels, stickers and boxes',
        services: [
          { id: 'pack-stickers', name: 'Custom Stickers' },
          { id: 'pack-labels', name: 'Product Labels' },
          { id: 'pack-boxes', name: 'Printed Boxes' },
          { id: 'pack-tags', name: 'Hang Tangs' },
        ],
      },
      {
        id: 'binding',
        name: 'Book binding & finishing',
        description: 'Post-print finishing services',
        services: [
          { id: 'bind-spiral', name: 'Spiral Binding' },
          { id: 'bind-twin-loop', name: 'Twin Loop Binding' },
          { id: 'bind-hard', name: 'Hard Binding / Thesis Binding' },
          { id: 'bind-perfect', name: 'Perfect Binding' },
        ],
      },
      {
        id: 'large-format',
        name: 'Large format printing',
        description: 'Banners, standees and signage',
        services: [
          { id: 'lf-flex-banner', name: 'Flex Banners' },
          { id: 'lf-vinyl', name: 'Vinyl Printing' },
          { id: 'lf-standee', name: 'Standees & Roll-ups' },
        ],
      },
      {
        id: 'specialty',
        name: 'Specialty printing',
        description: 'Premium finishes and personalised gifts',
        services: [
          { id: 'spec-canvas', name: 'Canvas Print' },
          { id: 'spec-mugs', name: 'Mug Print' },
          { id: 'spec-photo-prints', name: 'Photo Print' },
          { id: 'spec-tshirts', name: 'T shirt Print' },
        ],
      },
    ],
  },
  'paper-types': {
    label: 'Paper types',
    data: [
      { value: 'standard', label: 'Standard', hint: '70 GSM everyday paper', multiplier: 1 },
      {
        value: 'digital',
        label: 'Digital Paper',
        hint: '90 GSM smooth digital print paper',
        multiplier: 1.2,
      },
      { value: 'premium', label: 'Premium', hint: '100 GSM thick paper', multiplier: 1.4 },
      { value: 'glossy', label: 'Glossy', hint: 'Shiny photo finish', multiplier: 1.8 },
      { value: 'matte', label: 'Matte', hint: 'Non-reflective finish', multiplier: 1.6 },
    ],
  },
  'paper-sizes': {
    label: 'Paper sizes',
    data: [
      { value: 'A4', label: 'A4', hint: '210 × 297 mm', multiplier: 1 },
      { value: 'A5', label: 'A5', hint: '148 × 210 mm', multiplier: 0.8 },
      { value: 'A3', label: 'A3', hint: '297 × 420 mm', multiplier: 1.9 },
    ],
  },
  'finishing-options': {
    label: 'Finishing options',
    data: [
      { value: 'lamination', label: 'Lamination', price: 15 },
      { value: 'spiral-binding', label: 'Spiral binding', price: 40 },
      { value: 'hard-binding', label: 'Hard / Thesis binding', price: 120 },
      { value: 'corner-stapling', label: 'Corner Stapling', hint: 'Single staple at the top-left corner', price: 5 },
      { value: 'side-stapling', label: 'Side Stapling', hint: 'Staples along the left edge', price: 10 },
      { value: 'punching', label: 'Hole punching', price: 8 },
    ],
  },
  'cover-types': {
    label: 'Cover types',
    data: [
      { value: 'leather', label: 'Leatherette', hint: 'Premium textured finish' },
      { value: 'matte', label: 'Matte Laminated', hint: 'Smooth non-reflective' },
      { value: 'rexine', label: 'Rexine', hint: 'Durable classic finish' },
    ],
  },
  'spiral-coil-types': {
    label: 'Spiral coil types',
    data: [
      { value: 'plastic', label: 'Plastic Coil', hint: 'Flexible & durable' },
      { value: 'wire-o', label: 'Wire-O (Metal)', hint: 'Professional, lays flat' },
    ],
  },
  'spiral-cover-types': {
    label: 'Spiral cover types',
    data: [
      { value: 'clear', label: 'Clear Plastic', hint: 'Transparent front' },
      { value: 'frosted', label: 'Frosted Plastic', hint: 'Semi-transparent matte' },
      { value: 'printed', label: 'Printed Cardstock', hint: 'Full color printed cover' },
      { value: 'opaque', label: 'Opaque Cardstock', hint: 'Solid color heavy paper' },
    ],
  },
  'cover-colors': {
    label: 'Hard cover fabrics',
    data: [
      { value: 'navy', label: 'Navy Blue', class: 'bg-[#000080]', hex: '#000080' },
      { value: 'maroon', label: 'Maroon / Crimson', class: 'bg-[#800000]', hex: '#800000' },
      { value: 'black', label: 'Royal Black', class: 'bg-black', hex: '#111111' },
      { value: 'green', label: 'Dark Emerald Green', class: 'bg-[#006400]', hex: '#006400' },
    ],
  },
  'cover-text-colors': {
    label: 'Foil text colours',
    data: [
      { value: 'gold', label: 'Metallic Gold', class: 'bg-[#D4AF37]', hex: '#D4AF37' },
      { value: 'silver', label: 'Metallic Silver', class: 'bg-[#C0C0C0]', hex: '#C0C0C0' },
      { value: 'white', label: 'White', class: 'bg-white', hex: '#FFFFFF' },
    ],
  },
  'twin-loop-wire-colors': {
    label: 'Twin Loop wire colours',
    data: [
      { value: 'black', label: 'Pitch Black', class: 'bg-black', premium: false },
      { value: 'white', label: 'Bright White', class: 'bg-white', premium: false },
      { value: 'silver', label: 'Metallic Silver', class: 'bg-[#C0C0C0]', premium: false },
      { value: 'gold', label: 'Metallic Gold', class: 'bg-[#D4AF37]', premium: true },
      { value: 'rose-gold', label: 'Rose Gold', class: 'bg-[#B76E79]', premium: true },
      { value: 'royal-blue', label: 'Royal Blue', class: 'bg-[#4169E1]', premium: true },
      { value: 'forest-green', label: 'Forest Green', class: 'bg-[#228B22]', premium: true },
      { value: 'bronze', label: 'Bronze', class: 'bg-[#CD7F32]', premium: true },
    ],
  },
  'twin-loop-front-covers': {
    label: 'Twin Loop front covers',
    data: [
      {
        value: 'clear-gloss',
        label: 'Clear Gloss Acetate / PVC',
        hint: 'Transparent; first printed page remains visible',
      },
      {
        value: 'frosted-matte',
        label: 'Frosted / Matte Polypropylene',
        hint: 'Semi-opaque and scratch resistant',
      },
      {
        value: 'heavy-cardstock',
        label: 'Heavy Cardstock (300+ GSM)',
        hint: 'Printable artwork with matte or gloss lamination',
      },
    ],
  },
  'twin-loop-back-covers': {
    label: 'Twin Loop back covers',
    data: [
      {
        value: 'matching-front',
        label: 'Matching Front',
        hint: 'Use the same style as the selected front cover',
      },
      {
        value: 'vinyl-black',
        label: 'Heavy Vinyl / Leatherette — Black',
        hint: 'Rigid textured backing sheet',
      },
      {
        value: 'vinyl-navy',
        label: 'Heavy Vinyl / Leatherette — Navy',
        hint: 'Rigid textured backing sheet',
      },
    ],
  },
  'card-shapes': {
    label: 'Card shapes',
    data: [
      { value: 'rectangle', label: 'Standard (Rectangle)', hint: 'Classic business card outline' },
      { value: 'classic', label: 'Classic', hint: 'Softly rounded silhouette' },
      { value: 'square', label: 'Square', hint: 'Modern square format' },
      { value: 'leaf', label: 'Leaf', hint: 'Two opposite rounded corners' },
      { value: 'oval', label: 'Oval', hint: 'Fully curved edges' },
      { value: 'circle', label: 'Circle', hint: 'Round die-cut card' },
    ],
  },
  'card-papers': {
    label: 'Card paper & texture',
    data: [
      { value: 'glossy', label: 'Glossy', hint: 'Shiny coated stock' },
      { value: 'matte', label: 'Matte', hint: 'Smooth non-reflective stock' },
      { value: 'velvet', label: 'Velvet Touch', hint: 'Soft-touch lamination' },
      {
        value: 'premium-plus-glossy',
        label: 'Premium Plus Glossy',
        hint: 'Thick high-shine stock',
      },
      { value: 'non-tearable', label: 'Non-Tearable', hint: 'Waterproof synthetic stock' },
      { value: 'spot-uv', label: 'Spot UV', hint: 'Raised gloss highlights' },
      { value: 'pearl', label: 'Pearl', hint: 'Shimmer metallic stock' },
      { value: 'kraft', label: 'Kraft', hint: 'Natural brown recycled stock' },
      { value: 'diamond', label: 'Diamond', hint: 'Glitter finish stock' },
      { value: 'raised-foil', label: 'Raised Foil', hint: 'Embossed metallic accents' },
      { value: 'magnetic', label: 'Magnetic', hint: 'Fridge-magnet backing' },
      { value: 'transparent', label: 'Transparent', hint: 'Frosted plastic stock' },
    ],
  },
  'card-sizes': {
    label: 'Card sizes',
    data: [
      { value: 'standard', label: 'Standard', hint: '89 × 51 mm' },
      { value: 'square', label: 'Square', hint: '65 × 65 mm' },
      { value: 'mini', label: 'Mini', hint: '85 × 45 mm' },
    ],
  },
  'card-corners': {
    label: 'Card corners',
    data: [
      { value: 'standard', label: 'Standard', hint: 'Square-cut corners' },
      {
        value: 'rounded',
        label: 'Rounded',
        hint: 'Cut for a smooth finish',
        incompatibleWith: ['circle', 'oval', 'leaf'],
      },
    ],
  },
  'card-print-sides': {
    label: 'Card print sides',
    data: [
      { value: 'single', label: 'Single-sided', hint: 'Design on the front only' },
      { value: 'double', label: 'Double-sided', hint: 'Design on front and back' },
    ],
  },
};
