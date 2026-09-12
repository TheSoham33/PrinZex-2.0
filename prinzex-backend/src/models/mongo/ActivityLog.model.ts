import { Schema, model } from 'mongoose';

/**
 * ActivityLog (MongoDB)
 *
 * Append-only audit trail for every admin action.
 * Never update, only insert.
 */

export interface IActivityLog {
  adminId: string;
  adminName?: string;
  adminRole?: string;
  action: string; // "seller.approved", "order.cancelled" etc.
  entityType?: string; // "seller", "user", "order", "payout"
  entityId?: string;
  metadata?: Record<string, unknown>; // any extra context
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    adminId: { type: String, required: true },
    adminName: String,
    adminRole: String,
    action: { type: String, required: true }, // "seller.approved", "order.cancelled" etc.
    entityType: String, // "seller", "user", "order", "payout"
    entityId: String,
    metadata: Schema.Types.Mixed, // any extra context
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

activityLogSchema.index({ adminId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

export const ActivityLogModel = model<IActivityLog>('ActivityLog', activityLogSchema);
