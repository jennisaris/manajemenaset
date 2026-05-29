import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error('Supabase belum aktif: isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local / environment VPS.');
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = serviceRoleKey
  ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  : null;

async function countRows(table) {
  const { count, error } = await anon.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

const tables = ['roles', 'profiles', 'assets', 'land_assets', 'building_assets', 'asset_utilizations', 'asset_issues'];

console.log('Supabase URL:', url.replace(/^(https:\/\/)[^.]+/, '$1…'));
for (const table of tables) {
  console.log(`${table}: ${await countRows(table)} rows`);
}

if (admin) {
  const { data, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`storage buckets: ${error.message}`);
  const buckets = new Set(data.map((bucket) => bucket.name));
  for (const bucket of ['asset-photos', 'asset-documents']) {
    console.log(`${bucket}: ${buckets.has(bucket) ? 'bucket tersedia' : 'bucket belum ada'}`);
  }
} else {
  console.log('SUPABASE_SERVICE_ROLE_KEY belum diisi; cek bucket storage dilewati.');
}

console.log('Supabase real siap dipakai app.');
