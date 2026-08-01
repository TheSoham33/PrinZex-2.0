import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Delivery partners are not yet modelled in the database — return an empty
 * list so the admin delivery screen renders its empty state.
 */
export async function GET(req: Request) {
  const guarded = await requireRole(req.headers, ['ADMIN']);
  if ('response' in guarded) return guarded.response;
  return NextResponse.json({ data: [] });
}
