import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { buildInvoicePdf, invoiceNumberFor } from './invoicePdf';

/**
 * Order-owned GST invoice assembly (gap #9 — tax/invoice story).
 *
 * The invoice is rendered fresh from the ORDER ROW on every request — never
 * cached to disk and never put in signed public storage — so it always
 * reproduces the exact charge the customer paid (via the taxableAmount /
 * gstRatePercent snapshot columns frozen at placement), even after the admin
 * retunes the GST rate or the fee-taxability toggle.
 */

export interface OrderInvoice {
  pdf: Uint8Array;
  invoiceNumber: string;
  filename: string;
}

/** Load the order (owned by `customerId`) and render its GST invoice. */
export async function getOrderInvoice(customerId: string, orderId: string): Promise<OrderInvoice> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      items: { select: { serviceName: true, quantity: true, unitPrice: true, total: true } },
      seller: {
        select: { storeName: true, ownerName: true, gstNumber: true, storeAddress: true, city: true, state: true, pincode: true, phone: true, email: true },
      },
      customer: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const address = order.deliveryAddress as Record<string, unknown> | null;
  const buyerAddress = [
    address?.fullAddress,
    [address?.city, address?.state, address?.pincode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  const sellerAddress = [
    order.seller.storeAddress,
    [order.seller.city, order.seller.state, order.seller.pincode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  const invoiceNumber = invoiceNumberFor(order.id, order.createdAt);

  const pdf = await buildInvoicePdf({
    invoiceNumber,
    issuedAt: order.createdAt,
    orderId: order.id,
    deliverySpeed: order.deliverySpeed,
    paymentMethod: order.paymentMethod,
    seller: {
      name: order.seller.storeName,
      gstin: order.seller.gstNumber,
      address: sellerAddress || '—',
      phone: order.seller.phone,
      email: order.seller.email,
    },
    buyer: {
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      address: buyerAddress || '—',
    },
    items: order.items.map(
      (item: { serviceName: string; quantity: number; unitPrice: number | { toString(): string }; total: number | { toString(): string } }) => ({
        serviceName: item.serviceName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      }),
    ),
    amounts: {
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      rushFee: Number(order.rushFee),
      platformFee: Number(order.platformFee),
      discount: Number(order.discount),
      taxableAmount: Number(order.taxableAmount),
      gstRatePercent: Number(order.gstRatePercent),
      tax: Number(order.tax),
      total: Number(order.total),
    },
  });

  return { pdf, invoiceNumber, filename: `${invoiceNumber}.pdf` };
}
