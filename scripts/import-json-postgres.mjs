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
  console.error('DATABASE_URL belum diisi. Jalankan setelah PostgreSQL lokal tersedia.');
  process.exit(1);
}

const exportDir = resolve(process.cwd(), 'db', 'export');
const defaultPasswordHash = process.env.IMPORT_DEFAULT_PASSWORD_HASH;
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function readJson(name) {
  const path = resolve(exportDir, `${name}.json`);
  if (!existsSync(path)) {
    console.warn(`${name}: file export tidak ditemukan di ${path}`);
    return [];
  }
  const rows = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`${name}: ${rows.length} rows dibaca dari export`);
  return rows;
}

function clean(value) {
  return value === undefined ? null : value;
}

async function upsert(client, table, conflictColumn, row, columns) {
  const values = columns.map((column) => clean(row[column]));
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = columns
    .filter((column) => column !== conflictColumn)
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  const result = await client.query(
    `insert into ${table} (${columns.join(', ')}) values (${placeholders}) on conflict (${conflictColumn}) do update set ${updates}`,
    values,
  );
  return result.rowCount ?? 0;
}

const client = await pool.connect();
try {
  await client.query('begin');

  let roleWrites = 0;
  for (const role of readJson('roles')) {
    roleWrites += await upsert(client, 'roles', 'id', role, ['id', 'name', 'description']);
  }
  console.log(`roles: ${roleWrites} rows ditulis ke PostgreSQL`);

  const profiles = readJson('profiles');
  if (profiles.length > 0) {
    const emails = profiles.map((profile) => profile.email).filter(Boolean);
    const ids = profiles.map((profile) => profile.id).filter(Boolean);
    await client.query('delete from profiles where email = any($1::text[]) and not (id = any($2::uuid[]))', [emails, ids]);
  }
  for (const profile of profiles) {
    if (!profile.password_hash && !defaultPasswordHash) {
      throw new Error(`Profile ${profile.email || profile.id} belum punya password_hash. Isi IMPORT_DEFAULT_PASSWORD_HASH untuk import awal.`);
    }
    await upsert(client, 'profiles', 'id', { ...profile, password_hash: profile.password_hash || defaultPasswordHash }, [
      'id', 'full_name', 'email', 'password_hash', 'status', 'university_name', 'role_id', 'created_at', 'updated_at',
    ]);
  }

  for (const asset of readJson('assets')) {
    await upsert(client, 'assets', 'id', asset, [
      'id', 'asset_code', 'asset_name', 'asset_type', 'campus_name', 'faculty_or_unit', 'address', 'description',
      'ownership_status', 'condition_status', 'verification_status', 'latitude', 'longitude', 'geometry_type', 'geometry_geojson', 'created_at', 'updated_at',
    ]);
  }

  for (const land of readJson('land_assets')) {
    await upsert(client, 'land_assets', 'id', land, ['id', 'asset_id', 'land_area_m2']);
  }

  for (const building of readJson('building_assets')) {
    await upsert(client, 'building_assets', 'id', building, ['id', 'asset_id', 'building_area_m2']);
  }

  const seenPhotoKeys = new Set();
  for (const photo of readJson('asset_photos')) {
    const key = `${photo.asset_id}::${photo.photo_path}`;
    if (seenPhotoKeys.has(key)) continue;
    seenPhotoKeys.add(key);
    await client.query('delete from asset_photos where asset_id = $1 and photo_path = $2 and id <> $3', [photo.asset_id, photo.photo_path, photo.id]);
    await upsert(client, 'asset_photos', 'id', photo, ['id', 'asset_id', 'photo_path', 'photo_url', 'caption', 'photo_type', 'is_primary', 'created_at']);
  }

  const seenDocumentKeys = new Set();
  for (const document of readJson('asset_documents')) {
    const key = `${document.asset_id}::${document.file_path}`;
    if (seenDocumentKeys.has(key)) continue;
    seenDocumentKeys.add(key);
    await client.query('delete from asset_documents where asset_id = $1 and file_path = $2 and id <> $3', [document.asset_id, document.file_path, document.id]);
    await upsert(client, 'asset_documents', 'id', document, ['id', 'asset_id', 'document_name', 'document_type', 'file_path', 'created_at']);
  }

  for (const utilization of readJson('asset_utilizations')) {
    await upsert(client, 'asset_utilizations', 'id', utilization, [
      'id', 'asset_id', 'third_party_name', 'utilization_type', 'start_date', 'end_date', 'status', 'utilized_area_m2', 'description', 'created_at', 'updated_at',
    ]);
  }

  for (const issue of readJson('asset_issues')) {
    await upsert(client, 'asset_issues', 'id', issue, [
      'id', 'asset_id', 'issue_title', 'issue_type', 'description', 'found_date', 'priority', 'status', 'reported_by', 'resolved_at', 'final_result', 'created_at', 'updated_at',
    ]);
  }

  for (const progress of readJson('issue_progress')) {
    await upsert(client, 'issue_progress', 'id', progress, [
      'id', 'issue_id', 'progress_date', 'progress_description', 'responsible_person', 'result_note', 'status', 'created_at',
    ]);
  }

  for (const table of ['roles', 'assets', 'land_assets', 'building_assets', 'asset_photos', 'asset_documents', 'asset_utilizations', 'asset_issues', 'issue_progress']) {
    await client.query(`select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 1), true)`);
  }

  await client.query('commit');
  const counts = [];
  for (const table of ['roles', 'profiles', 'assets', 'asset_photos', 'asset_documents', 'asset_utilizations', 'asset_issues', 'issue_progress']) {
    const result = await client.query(`select count(*)::int as count from ${table}`);
    counts.push(`${table}:${result.rows[0].count}`);
  }
  console.log(`Import JSON Supabase ke PostgreSQL lokal selesai (${counts.join(', ')}).`);
} catch (error) {
  await client.query('rollback');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
