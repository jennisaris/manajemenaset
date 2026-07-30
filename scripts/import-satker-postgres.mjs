import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

const satkerJsonPath = resolve(process.cwd(), 'db', 'export', 'satker.json');

if (!existsSync(satkerJsonPath)) {
  console.error(`File ${satkerJsonPath} tidak ditemukan.`);
  process.exit(1);
}

const satkerList = JSON.parse(readFileSync(satkerJsonPath, 'utf8'));
console.log(`Ditemukan ${satkerList.length} data Satker dari JSON.`);

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL tidak diset. Import ke PostgreSQL dilewati (JSON fallback siap).');
  process.exit(0);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importSatker() {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists satker (
        id bigserial primary key,
        kode_satker text not null unique,
        nama_satker text not null,
        created_at timestamptz not null default now()
      );
    `);

    let importedCount = 0;
    for (const item of satkerList) {
      await client.query(
        `insert into satker (kode_satker, nama_satker)
         values ($1, $2)
         on conflict (kode_satker) do update set nama_satker = excluded.nama_satker`,
        [item.kode_satker, item.nama_satker]
      );
      importedCount++;
    }
    console.log(`Berhasil mengimpor/meng-update ${importedCount} data Satker di PostgreSQL!`);
  } catch (err) {
    console.error('Gagal mengimpor ke PostgreSQL:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

importSatker();
