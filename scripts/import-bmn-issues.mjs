import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pkg from 'pg';
const { Pool } = pkg;
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

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

const dbUrl = process.env.DATABASE_URL || 'postgresql://aset_user:change-me@127.0.0.1:5432/aset_universitas';
const excelPath = resolve(process.cwd(), 'docs/Rencana aksi penyelesaian masalah BMN.xlsx');

console.log(`Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
console.log(`Reading Excel: ${excelPath}`);

if (!existsSync(excelPath)) {
  console.error(`File Excel tidak ditemukan di ${excelPath}`);
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

function classifyIssueType(text) {
  const t = text.toLowerCase();
  if (t.includes('putusan') || t.includes('pengadilan') || t.includes('gugatan') || t.includes('kasasi') || t.includes('sengketa') || t.includes('eksekusi')) {
    return 'sengketa_tanah';
  }
  if (t.includes('klaim') || t.includes('ahli waris')) {
    return 'klaim_pihak_ketiga';
  }
  if (t.includes('dikuasai') || t.includes('serobot') || t.includes('rumah') || t.includes('sewa')) {
    return 'aset_dikuasai_pihak_lain';
  }
  if (t.includes('sertipikat') || t.includes('sertifikat') || t.includes('shm') || t.includes('hibah') || t.includes('sakti') || t.includes('simak') || t.includes('selisih')) {
    return 'dokumen_bermasalah';
  }
  if (t.includes('pagar') || t.includes('batas') || t.includes('patok') || t.includes('plang') || t.includes('irisan')) {
    return 'batas_lahan_tidak_jelas';
  }
  if (t.includes('tpu') || t.includes('makam') || t.includes('ibadah') || t.includes('fasilitas umum')) {
    return 'pemanfaatan_tidak_sesuai';
  }
  return 'sengketa_tanah';
}

function extractResponsiblePerson(text) {
  const persons = [];
  const t = text.toLowerCase();
  if (t.includes('biro hukum')) persons.push('Biro Hukum');
  if (t.includes('biro keu') || t.includes('biro keuangan')) persons.push('Biro Keuangan & BMN');
  if (t.includes('itjen') || t.includes('irjen')) persons.push('Itjen Kemdiktisaintek');
  if (t.includes('kemkeu') || t.includes('kpknl')) persons.push('Kemenkeu / DJKN');
  if (t.includes('bpn') || t.includes('kantah')) persons.push('Kantah / BPN');
  if (t.includes('pemda') || t.includes('pemprov') || t.includes('kelurahan') || t.includes('kecamatan')) persons.push('Pemerintah Daerah');
  if (t.includes('pengadilan') || t.includes('aph')) persons.push('Pengadilan / APH');

  if (persons.length === 0) {
    return 'Tim Satker Kampus & Biro Hukum BMN';
  }
  return persons.join(', ');
}

function extractDate(text) {
  // Look for 4-digit years like 2012, 2016, 2019, 2023, 2024
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) {
    return `${match[1]}-01-01`;
  }
  return '2024-01-01';
}

async function getOrCreateCampusAsset(client, satkerName) {
  const cleanName = satkerName.trim();
  const keyword = cleanName.replace(/Universitas|Institut|Politeknik Negeri/gi, '').trim();

  // Try finding existing asset in database
  const res = await client.query(
    `select id, asset_code, asset_name, campus_name, nama_satker 
     from assets 
     where campus_name ilike $1 or nama_satker ilike $1 or asset_name ilike $1 
     order by id asc limit 1`,
    [`%${keyword}%`]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // Create representative land asset
  const codePrefix = cleanName
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 8);
  const assetCode = `BMN-LAND-${codePrefix}`;
  const assetName = `Tanah dan Lahan Kampus ${cleanName}`;

  // Check if already created
  const existingCode = await client.query('select id, asset_code, asset_name from assets where asset_code = $1', [assetCode]);
  if (existingCode.rows.length > 0) {
    return existingCode.rows[0];
  }

  const campusKodeSatkerMap = {
    'Universitas Riau': '139030900693425001KD',
    'Universitas Lambung Mangkurat': '139031500693381017KD',
    'Universitas Negeri Manado': '139031700693383000KD',
    'Politeknik Negeri Ujung Pandang': '139031900693481000KD',
    'Universitas Andalas': '139030300693441000KD',
    'Universitas Bengkulu': '139032600693392001KD',
    'Universitas Hasanudin': '139032300693415000KD',
    'Universitas Hasanuddin': '139032300693415000KD',
    'Universitas Udayana': '139032200693389000KD',
    'Universitas Pendidikan Ganesha': '139032200693393000KD',
    'Institut Teknologi Bandung': '139030100693412000KD',
    'Universitas Padjajaran': '139030200693413000KD',
    'Universitas Padjadjaran': '139030200693413000KD',
    'Universitas Sulawesi Barat': '139033400693423000KD',
  };
  const kodeSatker = campusKodeSatkerMap[cleanName] || null;

  const insertRes = await client.query(
    `insert into assets (
      asset_code, asset_name, asset_type, campus_name, nama_satker, kode_satker,
      verification_status, ownership_status, condition_status, description
    ) values ($1, $2, 'land', $3, $3, $4, 'terverifikasi', 'Milik Pemerintah RI', 'Dalam Sengketa / Pengawasan', $5)
    returning id, asset_code, asset_name`,
    [assetCode, assetName, cleanName, kodeSatker, `Aset tanah BMN di lingkungan ${cleanName} yang tercatat dalam Rencana Aksi Penyelesaian Masalah BMN.`]
  );

  await client.query(
    'insert into land_assets (asset_id, land_area_m2) values ($1, 0) on conflict do nothing',
    [insertRes.rows[0].id]
  );

  return insertRes.rows[0];
}

async function runImport() {
  const client = await pool.connect();
  try {
    const wb = xlsx.readFile(excelPath);
    const sheet = wb.Sheets['Prioritas 1'] || wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`Ditemukan ${rows.length} baris kasus di Excel.`);

    let insertedIssues = 0;
    let updatedIssues = 0;
    let insertedProgress = 0;

    for (const r of rows) {
      const satker = (r['Satker'] || '').trim();
      const rawJudul = (r['Judul Temuan'] || '').trim().replace(/\r?\n/g, ' ');
      const uraian = (r['Uraian Kasus'] || '').trim();
      const rencana = (r['Rencana Tindak Lanjut'] || '').trim();
      const no = r['No'];

      if (!satker || !rawJudul) continue;

      const issueTitle = `[${satker}] ${rawJudul}`;
      const asset = await getOrCreateCampusAsset(client, satker);
      const combinedText = `${rawJudul} ${uraian} ${rencana}`;
      const issueType = classifyIssueType(combinedText);
      const foundDate = extractDate(combinedText);
      const pj = extractResponsiblePerson(rencana);

      // Check if issue already exists
      const existingIssue = await client.query(
        'select id from asset_issues where issue_title = $1 limit 1',
        [issueTitle]
      );

      let issueId;
      if (existingIssue.rows.length > 0) {
        issueId = existingIssue.rows[0].id;
        await client.query(
          `update asset_issues 
           set asset_id = $1, issue_type = $2, priority = 'mendesak', status = 'permasalahan', 
               found_date = $3, description = $4, updated_at = now() 
           where id = $5`,
          [asset.id, issueType, foundDate, uraian, issueId]
        );
        updatedIssues++;
      } else {
        const insertRes = await client.query(
          `insert into asset_issues (
            asset_id, issue_title, issue_type, priority, status, found_date, description
          ) values ($1, $2, $3, 'mendesak', 'permasalahan', $4, $5) 
          returning id`,
          [asset.id, issueTitle, issueType, foundDate, uraian]
        );
        issueId = insertRes.rows[0].id;
        insertedIssues++;
      }

      // Check if progress already recorded for this issue
      const existingProg = await client.query(
        'select id from issue_progress where issue_id = $1 limit 1',
        [issueId]
      );

      if (existingProg.rows.length === 0) {
        await client.query(
          `insert into issue_progress (
            issue_id, progress_date, progress_description, responsible_person, result_note, status
          ) values ($1, current_date, $2, $3, 'Rencana Aksi Prioritas 1 Penyelesaian Masalah BMN Kemdiktisaintek', 'dalam_proses')`,
          [issueId, rencana, pj]
        );
        insertedProgress++;
      } else {
        await client.query(
          `update issue_progress 
           set progress_description = $1, responsible_person = $2, updated_at = now() 
           where id = $3`,
          [rencana, pj, existingProg.rows[0].id]
        );
      }
    }

    console.log('\n=== HASIL IMPORT DATA BMN ===');
    console.log(`- Permasalahan baru ditambahkan: ${insertedIssues}`);
    console.log(`- Permasalahan diperbarui: ${updatedIssues}`);
    console.log(`- Tindak lanjut (progres) ditambahkan: ${insertedProgress}`);

    const totalIssues = await client.query('select count(*) as count from asset_issues');
    const totalProg = await client.query('select count(*) as count from issue_progress');
    console.log(`- Total data asset_issues di database: ${totalIssues.rows[0].count}`);
    console.log(`- Total data issue_progress di database: ${totalProg.rows[0].count}`);
  } catch (err) {
    console.error('Terjadi kesalahan saat import:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runImport();
