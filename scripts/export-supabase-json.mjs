import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceRoleKey || anonKey;
if (!url || !key) {
  console.error('Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY terlebih dahulu.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const outDir = resolve(process.cwd(), 'db', 'export');
mkdirSync(outDir, { recursive: true });

const tables = ['roles', 'profiles', 'assets', 'land_assets', 'building_assets', 'asset_photos', 'asset_documents', 'asset_utilizations', 'asset_issues', 'issue_progress'];
for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.warn(`${table}: skipped (${error.message})`);
    continue;
  }
  writeFileSync(resolve(outDir, `${table}.json`), JSON.stringify(data ?? [], null, 2));
  console.log(`${table}: ${(data ?? []).length} rows -> db/export/${table}.json`);
}
console.log('Export selesai. Import ke PostgreSQL lokal dapat dibuat dari file JSON ini setelah database tersedia.');
