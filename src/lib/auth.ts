import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db/postgres';
import { redis } from '@/lib/db/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'prinzex-dev-secret-change-me';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  name: string;
  email: string;
  sellerId?: string;
}

const SESSION_PREFIX = 'session:';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Create a signed JWT and store the session payload in Redis. */
export async function createSession(user: SessionUser): Promise<string> {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
  await redis
    .set(`${SESSION_PREFIX}${token}`, JSON.stringify(user), 'EX', SESSION_TTL)
    .catch(() => {});
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${token}`).catch(() => {});
}

export function readToken(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** Resolve the signed-in session user from a request's Authorization header. */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const token = readToken(headers);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    const cached = await redis.get(`${SESSION_PREFIX}${token}`).catch(() => null);
    if (cached) return JSON.parse(cached) as SessionUser;

    // Rebuild from DB if the Redis session expired but the JWT is still valid.
    const user = await query(
      `SELECT id, role, name, email FROM "users" WHERE id = $1`,
      [payload.sub],
    );
    if (!user.rowCount) return null;
    const row = user.rows[0];

    const session: SessionUser = {
      id: row.id,
      role: row.role,
      name: row.name,
      email: row.email,
    };
    await createSession(session).catch(() => {});
    return session;
  } catch {
    return null;
  }
}

/** Resolve a seller id for the current user (seller must be approved). */
export async function getSellerIdForUser(user: SessionUser): Promise<string | null> {
  if (user.role !== 'SELLER') return null;
  const seller = await query(`SELECT id, status FROM "sellers" WHERE "userId" = $1`, [user.id]);
  return seller.rowCount && seller.rows[0].status === 'APPROVED' ? seller.rows[0].id : null;
}

export { JWT_SECRET };
