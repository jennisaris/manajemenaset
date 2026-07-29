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

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addSoftDeleteColumn() {
  const client = await pool.connect();
  try {
    console.log('Menambahkan kolom is_deleted (0 = aktif, 1 = terhapus/soft delete) ke tabel assets...');
    await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_deleted smallint NOT NULL DEFAULT 0;');
    console.log('Kolom is_deleted berhasil ditambahkan!');
  } catch (error) {
    console.error('Gagal menambahkan kolom is_deleted:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addSoftDeleteColumn();
