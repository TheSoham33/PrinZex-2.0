import { Schema, model } from 'mongoose';

/**
 * OrderTimeline (MongoDB)
 *
 * Stores the complete order lifecycle event log. The PostgreSQL `Order`
 * table is the source of truth for the *current* status; this collection
 * stores the full timeline, admin notes and dispute details.
 */

export interface IOrderTimelineEvent {
  status: string;
  label?: string;
  timestamp: Date;
  note?: string;
  updatedBy: string; // userId or "system"
}

export interface IOrderAdminNote {
  note: string;
  adminId: string;
  createdAt: Date;
}

export interface IOrderDisputeDetails {
  isDisputed: boolean;
  reason?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface IOrderTimeline {
  orderId: string; // FK to PostgreSQL Order.id
  timeline: IOrderTimelineEvent[];
  adminNotes: IOrderAdminNote[];
  disputeDetails: IOrderDisputeDetails;
  createdAt?: Date;
  updatedAt?: Date;
}

const orderTimelineEventSchema = new Schema<IOrderTimelineEvent>(
  {
    status: String,
    label: String,
    timestamp: Date,
    note: String,
    updatedBy: String, // userId or "system"
  },
  { _id: false },
);

const orderMongoSchema = new Schema<IOrderTimeline>(
  {
    orderId: { type: String, required: true, unique: true }, // FK to PostgreSQL Order.id
    timeline: [orderTimelineEventSchema],
    adminNotes: [{ note: String, adminId: String, createdAt: Date }],
    disputeDetails: {
      isDisputed: { type: Boolean, default: false },
      reason: String,
      resolution: String,
      resolvedAt: Date,
      resolvedBy: String,
    },
  },
  { timestamps: true },
);

export const OrderTimelineModel = model<IOrderTimeline>('OrderTimeline', orderMongoSchema);
