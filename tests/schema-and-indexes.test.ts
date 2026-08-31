import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Schema SQL mendefinisikan seluruh tabel sistem aset secara lengkap', () => {
  const schemaPath = resolve(process.cwd(), 'db', 'schema.sql');
  assert.equal(existsSync(schemaPath), true, 'db/schema.sql harus ada');

  const schemaContent = readFileSync(schemaPath, 'utf8');

  // Memastikan tabel inti terdefinisi
  const requiredTables = [
    'roles',
    'profiles',
    'assets',
    'land_assets',
    'building_assets',
    'asset_photos',
    'asset_documents',
    'asset_utilizations',
    'asset_issues',
    'issue_progress',
    'satker',
    'bmn_alat_angkutan',
    'bmn_khusus_tik',
    'bmn_non_tik',
    'bmn_disposals',
  ];

  for (const table of requiredTables) {
    const tableRegex = new RegExp(`create table if not exists ${table}\\s*\\(`, 'i');
    assert.match(
      schemaContent,
      tableRegex,
      `Tabel "${table}" wajib terdefinisi di db/schema.sql`
    );
  }
});

test('Schema SQL mendefinisikan kolom spesifik issue_progress dan bmn_alat_angkutan secara akurat', () => {
  const schemaPath = resolve(process.cwd(), 'db', 'schema.sql');
  const schemaContent = readFileSync(schemaPath, 'utf8');

  // Kolom issue_progress tidak boleh tercampur kolom BMN
  const issueProgressMatch = schemaContent.match(/create table if not exists issue_progress\s*\(([\s\S]*?)\);/i);
  assert.ok(issueProgressMatch, 'Tabel issue_progress harus ditemukan');
  const issueProgressDef = issueProgressMatch[1];

  assert.match(issueProgressDef, /issue_id bigint/i);
  assert.match(issueProgressDef, /progress_date date/i);
  assert.match(issueProgressDef, /progress_description text/i);
  assert.match(issueProgressDef, /document_name text/i);
  assert.match(issueProgressDef, /document_path text/i);
  assert.match(issueProgressDef, /document_url text/i);

  // Kolom bmn_alat_angkutan harus memiliki kolom BMN lengkap
  const bmnAlatAngkutanMatch = schemaContent.match(/create table if not exists bmn_alat_angkutan\s*\(([\s\S]*?)\);/i);
  assert.ok(bmnAlatAngkutanMatch, 'Tabel bmn_alat_angkutan harus ditemukan');
  const bmnDef = bmnAlatAngkutanMatch[1];

  assert.match(bmnDef, /kode_satker text/i);
  assert.match(bmnDef, /nama_satker text/i);
  assert.match(bmnDef, /kode_barang text/i);
  assert.match(bmnDef, /nama_barang text/i);
  assert.match(bmnDef, /status_bmn text/i);
});

test('Indexes SQL mendefinisikan seluruh index performa yang dibutuhkan sistem', () => {
  const indexesPath = resolve(process.cwd(), 'db', 'indexes.sql');
  assert.equal(existsSync(indexesPath), true, 'db/indexes.sql harus ada');

  const indexesContent = readFileSync(indexesPath, 'utf8');

  const requiredIndexes = [
    'idx_assets_is_deleted_verification',
    'idx_assets_kode_satker',
    'idx_assets_campus_name',
    'idx_assets_type',
    'idx_asset_photos_asset_id',
    'idx_asset_documents_asset_id',
    'idx_asset_utilizations_asset_id_status',
    'idx_asset_issues_asset_id_status',
    'idx_issue_progress_issue_id',
    'idx_bmn_alat_angkutan_satker',
    'idx_bmn_khusus_tik_satker',
    'idx_bmn_non_tik_satker',
    'idx_bmn_disposals_satker',
    'idx_bmn_disposals_status',
    'idx_profiles_status',
    'idx_profiles_nip',
    'idx_profiles_kode_satker',
    'idx_satker_kode',
  ];

  for (const idx of requiredIndexes) {
    const idxRegex = new RegExp(`create index if not exists ${idx}\\s+on`, 'i');
    assert.match(
      indexesContent,
      idxRegex,
      `Indeks "${idx}" wajib terdefinisi di db/indexes.sql`
    );
  }
});
