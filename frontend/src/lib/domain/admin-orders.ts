/** Support-ticket domain types + category labels. */

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'delivery_issue' | 'quality' | 'payment' | 'other';

export interface TicketMessage {
  id: string;
  from: 'customer' | 'agent';
  author: string;
  body: string;
  at: string;
}

export interface SupportTicket {
  id: string;
  customerName: string;
  customerId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  assignedTo: string;
  status: TicketStatus;
  createdAt: string;
  linkedOrderId: string | null;
  thread: TicketMessage[];
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  delivery_issue: 'Delivery issue',
  quality: 'Quality',
  payment: 'Payment',
  other: 'Other',
};
