import 'server-only';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { databaseUrl } from '@/lib/backend-config';

let pool: Pool | null = null;

export function getPool() {
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

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function transaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>) {
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
