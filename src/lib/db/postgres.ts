import { Pool, type QueryResult, type QueryResultRow } from 'pg';

/**
 * PostgreSQL connection pool (primary relational store) via node-postgres.
 * Connection string comes from DATABASE_URL — local docker-compose by default,
 * or a free-tier cloud provider (Neon / Supabase) in production.
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://prinzex:prinzex@localhost:5432/prinzex?schema=public';

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool = globalForPg.pgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

/** Run a parameterised query. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as string[]);
}
