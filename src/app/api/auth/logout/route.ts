import { destroySession, readToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const token = readToken(req.headers);
  if (token) await destroySession(token);
  return NextResponse.json({ data: { ok: true } });
}
