import { Schema, model } from 'mongoose';

/**
 * Notification (MongoDB)
 *
 * Every notification pushed to any actor (customer, seller, delivery boy,
 * admin). High write volume and schema-flexible payload (`data`).
 */

export type NotificationRecipientType = 'customer' | 'seller' | 'delivery_boy' | 'admin';

export const NOTIFICATION_RECIPIENT_TYPES: NotificationRecipientType[] = [
  'customer',
  'seller',
  'delivery_boy',
  'admin',
];

export interface INotification {
  recipientId: string; // userId or sellerId or deliveryBoyId
  recipientType: NotificationRecipientType;
  type: string; // "order_update", "promo", "payout", "review_reply" etc.
  title: string;
  body: string;
  data?: Record<string, unknown>; // extra payload (orderId, etc.)
  isRead: boolean;
  readAt?: Date;
  channel: string[]; // ["push", "email", "sms"]
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true }, // userId or sellerId or deliveryBoyId
    recipientType: { type: String, enum: NOTIFICATION_RECIPIENT_TYPES },
    type: String, // "order_update", "promo", "payout", "review_reply" etc.
    title: String,
    body: String,
    data: Schema.Types.Mixed, // extra payload (orderId, etc.)
    isRead: { type: Boolean, default: false },
    readAt: Date,
    channel: [String], // ["push", "email", "sms"]
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const NotificationModel = model<INotification>('Notification', notificationSchema);
