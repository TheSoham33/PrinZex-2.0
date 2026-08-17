import type { ExtendedError, Socket } from 'socket.io';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt';

/**
 * Socket.io auth middleware — applied to EVERY namespace. The REST access
 * token is verified at the connection handshake; the decoded payload rides
 * on `socket.data.user` for the socket's lifetime.
 *
 * Token sources (first match wins):
 *   1. `socket.handshake.auth.token`   (canonical for socket.io clients)
 *   2. `Authorization: Bearer <jwt>`   (handy for curl/tests/proxies)
 */
export type SocketNext = (err?: ExtendedError) => void;

export function extractHandshakeToken(socket: Socket): string | null {
  const authToken = (socket.handshake.auth as Record<string, unknown> | undefined)?.token;
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }
  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

export function socketAuthMiddleware(socket: Socket, next: SocketNext): void {
  const token = extractHandshakeToken(socket);
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

/**
 * The decoded JWT payload of a connected socket. Middleware guarantees its
 * presence — namespaces/rate handlers use this instead of casting inline.
 */
export function socketUser(socket: Socket): TokenPayload {
  const user = socket.data.user as TokenPayload | undefined;
  if (!user) {
    // Cannot happen past socketAuthMiddleware; fail loudly if misused.
    throw new Error('socket.data.user missing — socketAuthMiddleware not applied?');
  }
  return user;
}
