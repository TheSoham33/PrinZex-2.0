import { getSessionUser } from '@/lib/auth';
import { fail } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const user = await getSessionUser(req.headers);
  if (!user) return fail('Not authenticated', 401);
  return NextResponse.json({ data: { user } });
}
