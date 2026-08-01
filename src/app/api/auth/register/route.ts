import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { hashPassword, createSession } from '@/lib/auth';
import { readBody, fail } from '@/lib/api-helpers';

export async function POST(req: Request) {
  const body = await readBody<{ name?: string; email?: string; password?: string }>(req);
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return fail('Name, email and password are required');
  }
  if (password.length < 6) {
    return fail('Password must be at least 6 characters');
  }

  const existing = await query('SELECT id FROM "users" WHERE email = $1', [
    email.toLowerCase(),
  ]);
  if (existing.rowCount) {
    return fail('An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  const inserted = await query(
    `INSERT INTO "users" (role, name, email, "passwordHash", status, "emailVerified")
     VALUES ('CUSTOMER', $1, $2, $3, 'ACTIVE', true)
     RETURNING id, name, email, role`,
    [name, email.toLowerCase(), passwordHash],
  );
  const user = inserted.rows[0];

  const token = await createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return NextResponse.json(
    { data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } },
    { status: 201 },
  );
}
