import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
const { Pool } = pg;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const connectionString = process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    console.log('No DATABASE_URL set, skipping PostgreSQL user cleanup.');
    return;
  }
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    console.log('Cleaning non-superadmin user profiles from database...');
    const res = await client.query(`
      delete from profiles
      where lower(email) not in ('superadmin@aset.id', 'admin@aset.id')
        and role_id not in (select id from roles where name = 'Superadmin')
    `);
    console.log(`Deleted ${res.rowCount} non-superadmin user profiles.`);
    client.release();
  } catch (err) {
    console.warn('Could not clean users from PostgreSQL (database may be offline or unreachable):', err.message);
  } finally {
    await pool.end();
  }
}

run();
