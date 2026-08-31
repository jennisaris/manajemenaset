import 'server-only';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { databaseUrl } from '@/lib/backend-config';

let pool: Pool | null = null;
let bootstrapPromise: Promise<void> | null = null;

export function getPool(): Pool {
  if (!databaseUrl) throw new Error('DATABASE_URL belum diisi.');
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

/**
 * Direct query execution directly on the Pool connection without waiting for migrations.
 * Used exclusively by bootstrap migrations to avoid circular promise deadlocks.
 */
export async function directQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function ensureBootstrap(): Promise<void> {
  if (!databaseUrl) return;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const { runMigrations } = await import('@/lib/server/bootstrap');
        await runMigrations();
      } catch (err) {
        console.error('[db] Startup bootstrap failed:', err);
        // Reset promise so it can retry on future requests
        bootstrapPromise = null;
      }
    })();
  }
  await bootstrapPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  await ensureBootstrap();
  return getPool().query<T>(text, params);
}

export async function transaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  await ensureBootstrap();
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

