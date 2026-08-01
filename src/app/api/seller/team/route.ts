import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Team members are not yet modelled in the database — return an empty list so
 * the seller team screen renders its empty state until this is implemented.
 */
export async function GET(req: Request) {
  const guarded = await requireSeller(req.headers);
  if ('response' in guarded) return guarded.response;
  return NextResponse.json({ data: [] });
}
