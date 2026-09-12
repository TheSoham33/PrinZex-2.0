import { Schema, model } from 'mongoose';

/**
 * ChatMessage (MongoDB)
 *
 * Order-scoped chat history between a customer and the seller handling the
 * order. Written by the /chat Socket.io namespace (real-time) and read back
 * via GET /api/chat/:orderId/messages (cursor pagination for scroll-up).
 */

export interface IChatMessage {
  orderId: string;
  senderId: string; // userId of the sender (both roles carry one on their JWT)
  senderType: 'customer' | 'seller';
  content: string; // ≤ 1000 chars (enforced at the socket + REST boundary)
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    orderId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderType: { type: String, enum: ['customer', 'seller'], required: true },
    content: { type: String, required: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true },
);

chatMessageSchema.index({ orderId: 1, createdAt: 1 });

export const ChatMessageModel = model<IChatMessage>('ChatMessage', chatMessageSchema);
