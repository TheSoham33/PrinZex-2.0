import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyPassword, createSession } from '@/lib/auth';
import { readBody, fail } from '@/lib/api-helpers';

export async function POST(req: Request) {
  const body = await readBody<{ email?: string; password?: string; role?: string }>(req);
  const { email, password, role } = body;

  if (!email || !password) return fail('Email and password are required');

  const result = await query(
    `SELECT id, name, email, role, "passwordHash", status, "emailVerified"
     FROM "users" WHERE email = $1`,
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user) return fail('Invalid email or password', 401);
  if (user.status === 'BLOCKED') return fail('This account has been blocked', 403);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail('Invalid email or password', 401);

  if (role === 'admin' && user.role !== 'ADMIN') return fail('Forbidden', 403);
  if (role === 'seller' && user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return fail('Forbidden', 403);
  }

  const session = {
    id: user.id,
    role: user.role as 'CUSTOMER' | 'SELLER' | 'ADMIN',
    name: user.name,
    email: user.email,
  };

  // Attach sellerId for seller sessions.
  const seller = await query('SELECT id, status, "storeName", "ownerName" FROM "sellers" WHERE "userId" = $1', [user.id]);
  if (seller.rowCount) {
    Object.assign(session, { sellerId: seller.rows[0].id });
  }

  const token = await createSession(session);

  return NextResponse.json({
    data: {
      token,
      user: session,
      emailVerified: user.emailVerified,
      seller: seller.rowCount
        ? {
            id: seller.rows[0].id,
            storeName: seller.rows[0].storeName,
            ownerName: seller.rows[0].ownerName,
            email: user.email,
            status: seller.rows[0].status.toLowerCase(),
          }
        : undefined,
    },
  });
}
