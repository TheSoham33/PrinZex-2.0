import { Types } from 'mongoose';
import { ChatMessageModel } from '../../models/mongo/ChatMessage.model';
import { toChatMessageDto, verifyOrderAccess, type ChatMessageDto } from '../../realtime/namespaces/chat.namespace';
import { ApiError } from '../../utils/ApiError';
import type { TokenPayload } from '../../utils/jwt';

/**
 * Cursor-based chat history. Cursor = message id (ObjectId): lean on its
 * monotonic ordering with the (orderId, createdAt) index. `before` fetches
 * the page OLDER than the cursor; hasMore drives the client's "load older"
 * button. Ownership rule matches the socket namespace exactly.
 */

export interface ChatHistoryPage {
  messages: ChatMessageDto[]; // ascending for display
  hasMore: boolean;
  nextCursor: string | null; // pass as ?before= for the next (older) page
}

export async function getChatHistory(
  user: TokenPayload,
  orderId: string,
  query: { before?: string; limit: number },
): Promise<ChatHistoryPage> {
  const hasAccess = await verifyOrderAccess(orderId, user);
  if (!hasAccess) {
    // 404 (not 403) — do not disclose that the order exists to strangers.
    throw ApiError.notFound('Order not found');
  }

  if (query.before && !Types.ObjectId.isValid(query.before)) {
    throw ApiError.badRequest('Invalid cursor');
  }

  const filter = {
    orderId,
    ...(query.before ? { _id: { $lt: new Types.ObjectId(query.before) } } : {}),
  };
  // Fetch one extra row to know whether an older page exists.
  const docs = await ChatMessageModel.find(filter)
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .lean();

  const hasMore = docs.length > query.limit;
  const page = docs.slice(0, query.limit);
  const oldest = page[page.length - 1];

  return {
    messages: page.reverse().map(toChatMessageDto),
    hasMore,
    nextCursor: hasMore && oldest ? String(oldest._id) : null,
  };
}
