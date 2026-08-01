/** Platform-wide order records, disputes and support tickets for the admin panel. */

export type AdminOrderStatus =
  | 'placed'
  | 'accepted'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface AdminOrderTimelineEvent {
  label: string;
  actor: 'customer' | 'seller' | 'delivery' | 'system';
  timestamp: string | null;
}

export interface OrderDispute {
  id: string;
  raisedBy: 'customer' | 'seller';
  reason: string;
  detail: string;
  raisedAt: string;
  resolution: 'unresolved' | 'customer' | 'seller';
}

export interface AdminOrder {
  id: string;
  customerName: string;
  customerId: string;
  storeName: string;
  storeId: string;
  serviceName: string;
  specifications: string;
  fileName: string;
  quantity: number;
  total: number;
  status: AdminOrderStatus;
  placedAt: string;
  isRush: boolean;
  address: string;
  deliverySpeed: string;
  deliveryBoyId: string | null;
  deliveryBoyName: string | null;
  refunded: boolean;
  refundAmount: number;
  dispute: OrderDispute | null;
  timeline: AdminOrderTimelineEvent[];
}

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

export const SUPPORT_AGENTS = ['Farah Khan', 'Rohan Iyer', 'Aditi Verma', 'Unassigned'];

