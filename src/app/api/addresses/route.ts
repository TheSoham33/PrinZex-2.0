import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { requireUser, readBody, fail } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const result = await query(
    `SELECT id, label, "fullName", phone, street, city, state, pincode, "isDefault"
     FROM "addresses" WHERE "userId" = $1 ORDER BY "isDefault" DESC, "createdAt" DESC`,
    [guarded.user.id],
  );

  const addresses = result.rows.map((row) => ({
    id: row.id,
    label: row.label ?? 'Address',
    fullAddress: row.city
      ? `${row.street}, ${row.city}, ${row.state ?? ''} ${row.pincode ?? ''}`.trim()
      : row.street,
    phone: row.phone ?? '',
  }));

  return NextResponse.json({ data: addresses });
}

export async function POST(req: Request) {
  const guarded = await requireUser(req.headers);
  if ('response' in guarded) return guarded.response;

  const body = await readBody<{
    label?: string;
    fullAddress?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
  }>(req);
  const { label, fullAddress, street, city, state, pincode, phone } = body;

  const resolvedStreet = street ?? fullAddress;
  if (!resolvedStreet) {
    return fail('Address is required');
  }

  const inserted = await query(
    `INSERT INTO "addresses" ("userId", label, street, city, state, pincode, phone, "isDefault")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, label, street, city, state, pincode, phone`,
    [guarded.user.id, label ?? 'Home', resolvedStreet, city ?? null, state ?? null, pincode ?? null, phone ?? null, false],
  );

  const row = inserted.rows[0];
  return NextResponse.json(
    {
      data: {
        id: row.id,
        label: row.label,
        fullAddress: row.city
          ? `${row.street}, ${row.city}, ${row.state ?? ''} ${row.pincode ?? ''}`.trim()
          : row.street,
        phone: row.phone ?? '',
      },
    },
    { status: 201 },
  );
}
