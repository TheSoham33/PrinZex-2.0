import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;
  return NextResponse.json({ data: [] });
}
