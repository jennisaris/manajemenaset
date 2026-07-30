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

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL tidak diset. Import BMN ke PostgreSQL dilewati (JSON fallback siap).');
  process.exit(0);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const exportDir = resolve(process.cwd(), 'db', 'export');

async function importBmnCategory(client, tableName, jsonFileName) {
  const jsonPath = resolve(exportDir, jsonFileName);
  if (!existsSync(jsonPath)) {
    console.warn(`File ${jsonFileName} tidak ditemukan.`);
    return;
  }

  const items = JSON.parse(readFileSync(jsonPath, 'utf8'));
  console.log(`Mengimpor ${items.length} entri ke tabel ${tableName}...`);

  await client.query(`
    create table if not exists ${tableName} (
      id bigserial primary key,
      jenis_bmn text,
      kode_satker text,
      nama_satker text,
      kode_barang text,
      nup text,
      nama_barang text not null,
      status_bmn text default 'Aktif',
      merk text,
      tipe text,
      kondisi text default 'Baik',
      umur_aset integer default 0,
      intra_extra text default 'Intra',
      henti_guna text default 'Tidak',
      status_sbsn text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  let imported = 0;
  for (const item of items) {
    await client.query(
      `insert into ${tableName} (jenis_bmn, kode_satker, nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        item.jenis_bmn || null,
        item.kode_satker || null,
        item.nama_satker || null,
        item.kode_barang || null,
        item.nup || null,
        item.nama_barang || 'Aset BMN',
        item.status_bmn || 'Aktif',
        item.merk || null,
        item.tipe || null,
        item.kondisi || 'Baik',
        item.umur_aset || 0,
        item.intra_extra || 'Intra',
        item.henti_guna || 'Tidak',
        item.status_sbsn || null,
      ]
    );
    imported++;
  }
  console.log(`✓ ${imported} data berhasil diimpor ke ${tableName}.`);
}

async function run() {
  const client = await pool.connect();
  try {
    await importBmnCategory(client, 'bmn_alat_angkutan', 'bmn_alat_angkutan.json');
    await importBmnCategory(client, 'bmn_khusus_tik', 'bmn_khusus_tik.json');
    await importBmnCategory(client, 'bmn_non_tik', 'bmn_non_tik.json');
    console.log('\nSelesai mengimpor seluruh data BMN ke PostgreSQL!');
  } catch (err) {
    console.error('Gagal mengimpor BMN ke PostgreSQL:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
