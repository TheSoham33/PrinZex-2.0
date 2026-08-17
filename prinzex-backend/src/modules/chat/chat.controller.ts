import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { TokenPayload } from '../../utils/jwt';
import * as chatService from './chat.service';
import type { ChatHistoryQuery } from './chat.routes';

/** Chat history — identity from the JWT, never the request. */

export const getChatHistory = asyncHandler(async (req, res) => {
  const user = req.user as TokenPayload | undefined;
  if (!user) {
    throw ApiError.unauthorized();
  }
  const query = req.query as unknown as ChatHistoryQuery;
  const page = await chatService.getChatHistory(user, req.params.orderId, {
    ...(query.before ? { before: query.before } : {}),
    limit: query.limit,
  });
  res.status(200).json(new ApiResponse(200, page, 'Chat history fetched'));
});
