import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import readline from 'node:readline';
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

const columnDefs = [
  { csv: 'Jenis BMN', db: 'jenis_bmn', type: 'text' },
  { csv: 'Kode Satker', db: 'kode_satker', type: 'text' },
  { csv: 'Nama Satker', db: 'nama_satker', type: 'text' },
  { csv: 'Kode Barang', db: 'kode_barang', type: 'text' },
  { csv: 'NUP', db: 'nup', type: 'text' },
  { csv: 'Nama Barang', db: 'nama_barang', type: 'text' },
  { csv: 'Status BMN', db: 'status_bmn', type: 'text' },
  { csv: 'Merk', db: 'merk', type: 'text' },
  { csv: 'Tipe', db: 'tipe', type: 'text' },
  { csv: 'Kondisi', db: 'kondisi', type: 'text' },
  { csv: 'Umur Aset', db: 'umur_aset', type: 'numeric' },
  { csv: 'Intra / Extra', db: 'intra_extra', type: 'text' },
  { csv: 'Henti Guna', db: 'henti_guna', type: 'text' },
  { csv: 'Status SBSN', db: 'status_sbsn', type: 'text' },
  { csv: 'Status BMN Idle', db: 'status_bmn_idle', type: 'text' },
  { csv: 'Status Kemitraan', db: 'status_kemitraan', type: 'text' },
  { csv: 'BPYBDS', db: 'bpybds', type: 'text' },
  { csv: 'Usulan Barang Hilang', db: 'usulan_barang_hilang', type: 'text' },
  { csv: 'Usulan Barang RB', db: 'usulan_barang_rb', type: 'text' },
  { csv: 'Usul Hapus', db: 'usul_hapus', type: 'text' },
  { csv: 'Hibah DKTP', db: 'hibah_dktp', type: 'text' },
  { csv: 'Konsensi Jasa', db: 'konsensi_jasa', type: 'text' },
  { csv: 'Properti Investasi', db: 'properti_investasi', type: 'text' },
  { csv: 'Jenis Dokumen', db: 'jenis_dokumen', type: 'text' },
  { csv: 'No Dokumen', db: 'no_dokumen', type: 'text' },
  { csv: 'No BPKP', db: 'no_bpkp', type: 'text' },
  { csv: 'No Polisi', db: 'no_polisi', type: 'text' },
  { csv: 'Status Sertifikasi', db: 'status_sertifikasi', type: 'text' },
  { csv: 'Jenis Sertipikat', db: 'jenis_sertipikat', type: 'text' },
  { csv: 'No Sertifikat', db: 'no_sertifikat', type: 'text' },
  { csv: 'Nama', db: 'nama_sertifikat', type: 'text' },
  { csv: 'Tanggal Buku Pertama', db: 'tgl_buku_pertama', type: 'text' },
  { csv: 'Tanggal Perolehan', db: 'tgl_perolehan', type: 'text' },
  { csv: 'Tanggal Pengapusan', db: 'tgl_penghapusan', type: 'text' },
  { csv: 'Nilai Perolehan Pertama', db: 'nilai_perolehan_pertama', type: 'numeric' },
  { csv: 'Nilai Mutasi', db: 'nilai_mutasi', type: 'numeric' },
  { csv: 'Nilai Perolehan', db: 'nilai_perolehan', type: 'numeric' },
  { csv: 'Nilai Penyusutan', db: 'nilai_penyusutan', type: 'numeric' },
  { csv: 'Nilai Buku', db: 'nilai_buku', type: 'numeric' },
  { csv: 'Luas Tanah Seluruhnya', db: 'luas_tanah_seluruhnya', type: 'numeric' },
  { csv: 'Luas Tanah Untuk Bangunan', db: 'luas_tanah_untuk_bangunan', type: 'numeric' },
  { csv: 'Luas Tanah Untuk Sarana Lingkungan', db: 'luas_tanah_untuk_sarana_lingkungan', type: 'numeric' },
  { csv: 'Luas Lahan Kosong', db: 'luas_lahan_kosong', type: 'numeric' },
  { csv: 'Luas Bangunan', db: 'luas_bangunan', type: 'numeric' },
  { csv: 'Luas Tapak Bangunan', db: 'luas_tapak_bangunan', type: 'numeric' },
  { csv: 'Luas Pemanfataan', db: 'luas_pemanfaatan', type: 'numeric' },
  { csv: 'Jumlah Lantai', db: 'jumlah_lantai', type: 'numeric' },
  { csv: 'Jumlah Foto', db: 'jumlah_foto', type: 'numeric' },
  { csv: 'Status Penggunaan', db: 'status_penggunaan', type: 'text' },
  { csv: 'No PSP', db: 'no_psp', type: 'text' },
  { csv: 'Tanggal PSP', db: 'tgl_psp', type: 'text' },
  { csv: 'Alamat', db: 'alamat', type: 'text' },
  { csv: 'RT/RW', db: 'rt_rw', type: 'text' },
  { csv: 'Kelurahan/Desa', db: 'kelurahan_desa', type: 'text' },
  { csv: 'Kecamatan', db: 'kecamatan', type: 'text' },
  { csv: 'Kab/Kota', db: 'kab_kota', type: 'text' },
  { csv: 'Kode Kab/Kota', db: 'kode_kab_kota', type: 'text' },
  { csv: 'Provinsi', db: 'provinsi', type: 'text' },
  { csv: 'Kode Provinsi', db: 'kode_provinsi', type: 'text' },
  { csv: 'Kode Pos', db: 'kode_pos', type: 'text' },
  { csv: 'SBSK', db: 'sbsk', type: 'numeric' },
  { csv: 'Optimalisasi', db: 'optimalisasi', type: 'numeric' },
  { csv: 'Penghuni', db: 'penghuni', type: 'text' },
  { csv: 'Pengguna', db: 'pengguna', type: 'text' },
  { csv: 'Kode KPKNL', db: 'kode_kpknl', type: 'text' },
  { csv: 'Uraian KPKNL', db: 'uraian_kpknl', type: 'text' },
  { csv: 'Uraian Kanwil DJKN', db: 'uraian_kanwil_djkn', type: 'text' },
  { csv: 'Nama K/L', db: 'nama_kl', type: 'text' },
  { csv: 'Nama E1', db: 'nama_e1', type: 'text' },
  { csv: 'Nama Korwil', db: 'nama_korwil', type: 'text' },
  { csv: 'Kode Register', db: 'kode_register', type: 'text' },
  { csv: 'Lokasi Ruang', db: 'lokasi_ruang', type: 'text' },
  { csv: 'Jenis Identitas', db: 'jenis_identitas', type: 'text' },
  { csv: 'No Identitas', db: 'no_identitas', type: 'text' },
  { csv: 'No STNK', db: 'no_stnk', type: 'text' },
  { csv: 'Nama Pengguna', db: 'nama_pengguna', type: 'text' },
  { csv: 'Status PMK', db: 'status_pmk', type: 'text' },
  { csv: '_bmn_raw', db: 'bmn_raw', type: 'jsonb' },
];

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateSchema() {
  const client = await pool.connect();
  try {
    console.log('Menyesuaikan skema tabel assets di PostgreSQL...');
    for (const col of columnDefs) {
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ${col.db} ${col.type};`);
    }
    console.log('Skema tabel assets berhasil diperbarui dengan 78 kolom BMN!');
  } finally {
    client.release();
  }
}

function parseVal(val, type) {
  if (val === undefined || val === null || val === '') return null;
  if (type === 'numeric') {
    const num = Number(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  return val;
}

async function importCsv() {
  const filePath = 'D:\\2026\\DIKTI\\APLIKASI MANAJEMEN ASET\\daftar-aset-Gedung dan Bangunan PTN.csv';
  if (!existsSync(filePath)) {
    console.error(`File CSV tidak ditemukan di: ${filePath}`);
    process.exit(1);
  }

  const fileStream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let headers = [];
  let inserted = 0;
  const batchSize = 250;
  let batch = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for await (const line of rl) {
      lineCount++;
      if (lineCount === 1) {
        headers = line.split(';').map(h => h.trim());
        continue;
      }

      const cols = line.split(';');
      if (cols.length < 5) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx]?.trim() ?? '';
      });

      const kodeSatker = rowObj['Kode Satker'] || '';
      const kodeBarang = rowObj['Kode Barang'] || '';
      const nup = rowObj['NUP'] || '';
      const assetCode = `${kodeSatker}-${kodeBarang}-${nup}`;
      const assetName = rowObj['Nama Barang'] || 'Gedung dan Bangunan PTN';
      const campusName = rowObj['Nama Satker'] || 'Kampus Utama';
      const facultyOrUnit = rowObj['Nama E1'] || rowObj['Uraian KPKNL'] || 'Fakultas';
      const addressParts = [rowObj['Alamat'], rowObj['Kecamatan'], rowObj['Kab/Kota'], rowObj['Provinsi']].filter(Boolean);
      const fullAddress = addressParts.join(', ') || 'Indonesia';
      const description = [rowObj['Merk'], rowObj['Tipe'], rowObj['Lokasi Ruang']].filter(Boolean).join(' - ');
      const ownershipStatus = rowObj['Status Penggunaan'] || rowObj['Status Sertifikasi'] || 'Milik Negara';
      const conditionStatus = rowObj['Kondisi'] || 'Baik';
      const luasBangunan = parseVal(rowObj['Luas Bangunan'], 'numeric') || 0;

      const record = {
        asset_code: assetCode,
        asset_name: assetName,
        asset_type: 'building',
        campus_name: campusName,
        faculty_or_unit: facultyOrUnit,
        address: fullAddress,
        description: description,
        ownership_status: ownershipStatus,
        condition_status: conditionStatus,
        verification_status: 'terverifikasi',
        jenis_bmn: parseVal(rowObj['Jenis BMN'], 'text'),
        kode_satker: parseVal(rowObj['Kode Satker'], 'text'),
        nama_satker: parseVal(rowObj['Nama Satker'], 'text'),
        kode_barang: parseVal(rowObj['Kode Barang'], 'text'),
        nup: parseVal(rowObj['NUP'], 'text'),
        nama_barang: parseVal(rowObj['Nama Barang'], 'text'),
        status_bmn: parseVal(rowObj['Status BMN'], 'text'),
        merk: parseVal(rowObj['Merk'], 'text'),
        tipe: parseVal(rowObj['Tipe'], 'text'),
        kondisi: parseVal(rowObj['Kondisi'], 'text'),
        umur_aset: parseVal(rowObj['Umur Aset'], 'numeric'),
        intra_extra: parseVal(rowObj['Intra / Extra'], 'text'),
        henti_guna: parseVal(rowObj['Henti Guna'], 'text'),
        status_sbsn: parseVal(rowObj['Status SBSN'], 'text'),
        status_bmn_idle: parseVal(rowObj['Status BMN Idle'], 'text'),
        status_kemitraan: parseVal(rowObj['Status Kemitraan'], 'text'),
        bpybds: parseVal(rowObj['BPYBDS'], 'text'),
        usulan_barang_hilang: parseVal(rowObj['Usulan Barang Hilang'], 'text'),
        usulan_barang_rb: parseVal(rowObj['Usulan Barang RB'], 'text'),
        usul_hapus: parseVal(rowObj['Usul Hapus'], 'text'),
        hibah_dktp: parseVal(rowObj['Hibah DKTP'], 'text'),
        konsensi_jasa: parseVal(rowObj['Konsensi Jasa'], 'text'),
        properti_investasi: parseVal(rowObj['Properti Investasi'], 'text'),
        jenis_dokumen: parseVal(rowObj['Jenis Dokumen'], 'text'),
        no_dokumen: parseVal(rowObj['No Dokumen'], 'text'),
        no_bpkp: parseVal(rowObj['No BPKP'], 'text'),
        no_polisi: parseVal(rowObj['No Polisi'], 'text'),
        status_sertifikasi: parseVal(rowObj['Status Sertifikasi'], 'text'),
        jenis_sertipikat: parseVal(rowObj['Jenis Sertipikat'], 'text'),
        no_sertifikat: parseVal(rowObj['No Sertifikat'], 'text'),
        nama_sertifikat: parseVal(rowObj['Nama'], 'text'),
        tgl_buku_pertama: parseVal(rowObj['Tanggal Buku Pertama'], 'text'),
        tgl_perolehan: parseVal(rowObj['Tanggal Perolehan'], 'text'),
        tgl_penghapusan: parseVal(rowObj['Tanggal Pengapusan'], 'text'),
        nilai_perolehan_pertama: parseVal(rowObj['Nilai Perolehan Pertama'], 'numeric'),
        nilai_mutasi: parseVal(rowObj['Nilai Mutasi'], 'numeric'),
        nilai_perolehan: parseVal(rowObj['Nilai Perolehan'], 'numeric'),
        nilai_penyusutan: parseVal(rowObj['Nilai Penyusutan'], 'numeric'),
        nilai_buku: parseVal(rowObj['Nilai Buku'], 'numeric'),
        luas_tanah_seluruhnya: parseVal(rowObj['Luas Tanah Seluruhnya'], 'numeric'),
        luas_tanah_untuk_bangunan: parseVal(rowObj['Luas Tanah Untuk Bangunan'], 'numeric'),
        luas_tanah_untuk_sarana_lingkungan: parseVal(rowObj['Luas Tanah Untuk Sarana Lingkungan'], 'numeric'),
        luas_lahan_kosong: parseVal(rowObj['Luas Lahan Kosong'], 'numeric'),
        luas_bangunan: luasBangunan,
        luas_tapak_bangunan: parseVal(rowObj['Luas Tapak Bangunan'], 'numeric'),
        luas_pemanfaatan: parseVal(rowObj['Luas Pemanfataan'], 'numeric'),
        jumlah_lantai: parseVal(rowObj['Jumlah Lantai'], 'numeric'),
        jumlah_foto: parseVal(rowObj['Jumlah Foto'], 'numeric'),
        status_penggunaan: parseVal(rowObj['Status Penggunaan'], 'text'),
        no_psp: parseVal(rowObj['No PSP'], 'text'),
        tgl_psp: parseVal(rowObj['Tanggal PSP'], 'text'),
        alamat: parseVal(rowObj['Alamat'], 'text'),
        rt_rw: parseVal(rowObj['RT/RW'], 'text'),
        kelurahan_desa: parseVal(rowObj['Kelurahan/Desa'], 'text'),
        kecamatan: parseVal(rowObj['Kecamatan'], 'text'),
        kab_kota: parseVal(rowObj['Kab/Kota'], 'text'),
        kode_kab_kota: parseVal(rowObj['Kode Kab/Kota'], 'text'),
        provinsi: parseVal(rowObj['Provinsi'], 'text'),
        kode_provinsi: parseVal(rowObj['Kode Provinsi'], 'text'),
        kode_pos: parseVal(rowObj['Kode Pos'], 'text'),
        sbsk: parseVal(rowObj['SBSK'], 'numeric'),
        optimalisasi: parseVal(rowObj['Optimalisasi'], 'numeric'),
        penghuni: parseVal(rowObj['Penghuni'], 'text'),
        pengguna: parseVal(rowObj['Pengguna'], 'text'),
        kode_kpknl: parseVal(rowObj['Kode KPKNL'], 'text'),
        uraian_kpknl: parseVal(rowObj['Uraian KPKNL'], 'text'),
        uraian_kanwil_djkn: parseVal(rowObj['Uraian Kanwil DJKN'], 'text'),
        nama_kl: parseVal(rowObj['Nama K/L'], 'text'),
        nama_e1: parseVal(rowObj['Nama E1'], 'text'),
        nama_korwil: parseVal(rowObj['Nama Korwil'], 'text'),
        kode_register: parseVal(rowObj['Kode Register'], 'text'),
        lokasi_ruang: parseVal(rowObj['Lokasi Ruang'], 'text'),
        jenis_identitas: parseVal(rowObj['Jenis Identitas'], 'text'),
        no_identitas: parseVal(rowObj['No Identitas'], 'text'),
        no_stnk: parseVal(rowObj['No STNK'], 'text'),
        nama_pengguna: parseVal(rowObj['Nama Pengguna'], 'text'),
        status_pmk: parseVal(rowObj['Status PMK'], 'text'),
        bmn_raw: JSON.stringify(rowObj),
      };

      batch.push(record);

      if (batch.length >= batchSize) {
        await insertBatch(client, batch);
        inserted += batch.length;
        console.log(`Progress: ${inserted} / ${lineCount - 1} baris di-upload ke database`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await insertBatch(client, batch);
      inserted += batch.length;
    }

    await client.query('COMMIT');
    console.log(`\nBERHASIL! Total ${inserted} data aset BMN Gedung dan Bangunan di-upload ke tabel assets.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Gagal mengupload CSV ke PostgreSQL:', err);
  } finally {
    client.release();
  }
}

async function insertBatch(client, records) {
  const fields = Object.keys(records[0]);
  const columns = fields.join(', ');
  
  const valueRows = [];
  const queryParams = [];
  let paramIdx = 1;

  for (const rec of records) {
    const placeholders = [];
    for (const f of fields) {
      placeholders.push(`$${paramIdx++}`);
      queryParams.push(rec[f]);
    }
    valueRows.push(`(${placeholders.join(', ')})`);
  }

  const updateSet = fields
    .filter(f => f !== 'asset_code')
    .map(f => `${f} = EXCLUDED.${f}`)
    .join(', ');

  const sql = `
    INSERT INTO assets (${columns})
    VALUES ${valueRows.join(',\n')}
    ON CONFLICT (asset_code) DO UPDATE SET ${updateSet};
  `;

  await client.query(sql, queryParams);
}

await migrateSchema();
await importCsv();
await pool.end();
