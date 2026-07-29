import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

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

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diisi.');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const client = await pool.connect();
try {
  await client.query('begin');

  // Truncate tables for asset, utilization, and issue while preserving structure and users/roles
  console.log('Mengosongkan tabel aset, pemanfaatan, dan permasalahan...');
  await client.query('truncate table assets restart identity cascade;');

  await client.query('commit');

  const counts = [];
  for (const table of ['roles', 'profiles', 'assets', 'land_assets', 'building_assets', 'asset_photos', 'asset_documents', 'asset_utilizations', 'asset_issues', 'issue_progress']) {
    const result = await client.query(`select count(*)::int as count from ${table}`);
    counts.push(`${table}: ${result.rows[0].count}`);
  }

  console.log('Penghapusan data selesai!');
  console.log('Jumlah data saat ini:');
  console.log(counts.join('\n'));
} catch (error) {
  await client.query('rollback');
  console.error('Terjadi kesalahan saat menghapus data:', error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
