import pkg from 'pg';
const { Pool } = pkg;
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv(resolve(process.cwd(), '.env.local'));
loadEnv(resolve(process.cwd(), '.env'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://aset_user:change-me@127.0.0.1:5432/aset_universitas' });

const updates = [
  { id: 12918, kode: '139030100693412000KD', name: 'INSTITUT TEKNOLOGI BANDUNG' },
  { id: 12916, kode: '139030300693441000KD', name: 'UNIVERSITAS ANDALAS' },
  { id: 12917, kode: '139032300693415000KD', name: 'UNIVERSITAS HASANUDDIN' },
  { id: 12919, kode: '139030200693413000KD', name: 'UNIVERSITAS PADJADJARAN' },
];

async function run() {
  const client = await pool.connect();
  try {
    // 1. Insert Unhas into satker master table if not exists
    await client.query(`
      insert into satker (kode_satker, nama_satker, created_at)
      values ('693415', 'UNIVERSITAS HASANUDDIN', now())
      on conflict (kode_satker) do update set nama_satker = excluded.nama_satker
    `);
    console.log('Master satker UNHAS (693415) ensured.');

    // 2. Update assets table for the 4 campus assets
    for (const u of updates) {
      const res = await client.query(
        'update assets set kode_satker = $1, nama_satker = $2, campus_name = $2 where id = $3 returning id, asset_code, nama_satker, kode_satker',
        [u.kode, u.name, u.id]
      );
      console.log('Updated asset:', res.rows[0]);
    }

    // 3. Verify all issues and their satker codes
    const q = `
      select distinct 
        a.campus_name, 
        a.nama_satker, 
        a.kode_satker,
        count(ai.id) as total_issues
      from asset_issues ai
      join assets a on ai.asset_id = a.id
      group by a.campus_name, a.nama_satker, a.kode_satker
      order by a.campus_name asc
    `;
    const resAll = await client.query(q);
    console.log('\n=== MAPPING SEMUA SATKER DI PERMASALAHAN ===');
    console.table(resAll.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

run();
