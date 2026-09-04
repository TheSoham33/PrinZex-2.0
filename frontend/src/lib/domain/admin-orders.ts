/** Support-ticket domain type + category labels. */

export type TicketCategory = 'delivery_issue' | 'quality' | 'payment' | 'other';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  delivery_issue: 'Delivery issue',
  quality: 'Quality',
  payment: 'Payment',
  other: 'Other',
};
