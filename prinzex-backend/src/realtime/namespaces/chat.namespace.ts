import type { Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { ChatMessageModel, type IChatMessage } from '../../models/mongo/ChatMessage.model';
import { socketAuthMiddleware, socketUser } from '../socket.auth';
import { RT_EVENTS, RT_NAMESPACES, RT_ROOMS } from '../realtime.emitters';
import type { TokenPayload } from '../../utils/jwt';

/**
 * /chat namespace — order-scoped messaging between the customer and the
 * seller handling their order. Messages persist to MongoDB FIRST and are
 * then broadcast to the order's chat room (both parties).
 *
 * Access rule: the customer who owns the order OR the seller it belongs to.
 * Identity/ownership are checked against PostgreSQL — never the client.
 */

export const CHAT_HISTORY_ON_JOIN = 20;
const CHAT_MAX_LENGTH = 1000;

/** Shared with the REST chat history endpoint (same access rule). */
export async function verifyOrderAccess(orderId: string, user: TokenPayload): Promise<boolean> {
  try {
    if (user.role === 'CUSTOMER') {
      const order = await prisma.order.findFirst({
        where: { id: orderId, customerId: user.userId },
        select: { id: true },
      });
      return order !== null;
    }
    if (user.role === 'SELLER') {
      const order = await prisma.order.findFirst({
        where: { id: orderId, sellerId: user.sellerId },
        select: { id: true },
      });
      return order !== null;
    }
    return false; // delivery boys / admins have no order-chat access
  } catch (error) {
    // A DB hiccup denies access (fail-closed) rather than leaking a room.
    logger.error('chat_access_check_failed', { orderId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export interface ChatMessageDto {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'customer' | 'seller';
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date | null;
}

export function toChatMessageDto(doc: IChatMessage & { _id: unknown }): ChatMessageDto {
  return {
    id: String(doc._id),
    orderId: doc.orderId,
    senderId: doc.senderId,
    senderType: doc.senderType,
    content: doc.content,
    isRead: doc.isRead,
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt ?? null,
  };
}

// ── Handlers (exported for tests) ──────────────────────────────────────────

export async function handleChatJoin(chatNs: Namespace, socket: Socket, orderId: string): Promise<void> {
  const user = socketUser(socket);
  const hasAccess = await verifyOrderAccess(orderId, user);
  if (!hasAccess) {
    socket.emit(RT_EVENTS.ERROR, 'Access denied');
    return;
  }

  await socket.join(RT_ROOMS.chat(orderId));

  // Recent history on join (newest 20, re-ordered ascending for display).
  const history = await ChatMessageModel.find({ orderId }).sort({ createdAt: -1 }).limit(CHAT_HISTORY_ON_JOIN).lean();
  socket.emit(RT_EVENTS.CHAT_HISTORY, history.reverse().map(toChatMessageDto));
}

export async function handleChatMessage(chatNs: Namespace, socket: Socket, data: { orderId: string; content: string }): Promise<void> {
  const content = typeof data?.content === 'string' ? data.content.trim() : '';
  const orderId = typeof data?.orderId === 'string' ? data.orderId : '';
  if (!content || content.length > CHAT_MAX_LENGTH || !orderId) {
    return; // silently drop malformed payloads (client bug or abuse probe)
  }

  // Only members of the order room may post — membership required passing
  // the ownership check in chat:join first.
  if (!socket.rooms.has(RT_ROOMS.chat(orderId))) {
    socket.emit(RT_EVENTS.ERROR, 'Join the order chat before sending messages');
    return;
  }

  const user = socketUser(socket);
  if (user.role !== 'CUSTOMER' && user.role !== 'SELLER') {
    return;
  }
  const senderType: 'customer' | 'seller' = user.role === 'CUSTOMER' ? 'customer' : 'seller';
  const doc = await ChatMessageModel.create({
    orderId,
    senderId: user.userId, // both role payloads carry userId (matches spec snippet)
    senderType,
    content,
  });

  chatNs.to(RT_ROOMS.chat(orderId)).emit(RT_EVENTS.CHAT_MESSAGE, toChatMessageDto(doc));
}

export async function handleChatRead(chatNs: Namespace, socket: Socket, orderId: string): Promise<void> {
  const user = socketUser(socket);
  if (user.role !== 'CUSTOMER' && user.role !== 'SELLER') {
    return;
  }
  if (!socket.rooms.has(RT_ROOMS.chat(orderId))) {
    socket.emit(RT_EVENTS.ERROR, 'Join the order chat first');
    return;
  }

  // Mark the OTHER side's messages as read.
  const otherSide: 'customer' | 'seller' = user.role === 'CUSTOMER' ? 'seller' : 'customer';
  await ChatMessageModel.updateMany(
    { orderId, senderType: otherSide, isRead: false },
    { isRead: true, readAt: new Date() },
  );
  chatNs.to(RT_ROOMS.chat(orderId)).emit(RT_EVENTS.CHAT_READ_ACK, { orderId, readBy: user.userId });
}

// ── Namespace wiring ───────────────────────────────────────────────────────

export function initChatNamespace(io: Server): void {
  const chatNs: Namespace = io.of(RT_NAMESPACES.CHAT);
  chatNs.use(socketAuthMiddleware);

  chatNs.on('connection', (socket: Socket) => {
    logger.debug('chat_socket_connected', { socketId: socket.id });

    socket.on('chat:join', (orderId: unknown) => {
      if (typeof orderId !== 'string' || orderId.length === 0) {
        socket.emit(RT_EVENTS.ERROR, 'chat:join expects an order id');
        return;
      }
      void handleChatJoin(chatNs, socket, orderId);
    });

    socket.on('chat:message', (data: unknown) => {
      void handleChatMessage(chatNs, socket, data as { orderId: string; content: string });
    });

    socket.on('chat:read', (orderId: unknown) => {
      if (typeof orderId !== 'string' || orderId.length === 0) {
        return;
      }
      void handleChatRead(chatNs, socket, orderId);
    });

    socket.on('error', (error: Error) => {
      logger.error('chat_socket_error', { socketId: socket.id, error: error.message });
    });
  });
}
