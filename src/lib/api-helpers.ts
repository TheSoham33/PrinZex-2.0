import { NextResponse } from 'next/server';
import { getSessionUser, getSellerIdForUser, type SessionUser } from '@/lib/auth';

/** Standard JSON response wrapper. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** Error response with a consistent shape. */
export function fail(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status });
}

/** Parse JSON body defensively. */
export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Require an authenticated session, returning the user or a 401 response. */
export async function requireUser(
  headers: Headers,
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser(headers);
  if (!user) return { response: fail('Not authenticated', 401) };
  return { user };
}

/** Require an approved seller, returning their seller id. */
export async function requireSeller(
  headers: Headers,
): Promise<{ user: SessionUser; sellerId: string } | { response: NextResponse }> {
  const guarded = await requireRole(headers, ['SELLER']);
  if ('response' in guarded) return guarded;
  const sellerId = await getSellerIdForUser(guarded.user);
  if (!sellerId) return { response: fail('Seller account not approved', 403) };
  return { user: guarded.user, sellerId };
}

/** Require a specific role. */
export async function requireRole(
  headers: Headers,
  roles: SessionUser['role'][],
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const guarded = await requireUser(headers);
  if ('response' in guarded) return guarded;
  if (!roles.includes(guarded.user.role)) {
    return { response: fail('Forbidden', 403) };
  }
  return guarded;
}
