import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { query } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';
import type { BmnAssetItem, BmnCategoryType } from '@/lib/types';

const categoryTableMap: Record<BmnCategoryType, string> = {
  alat_angkutan: 'bmn_alat_angkutan',
  khusus_tik: 'bmn_khusus_tik',
  non_tik: 'bmn_non_tik',
};

const categoryJsonMap: Record<BmnCategoryType, string> = {
  alat_angkutan: 'bmn_alat_angkutan.json',
  khusus_tik: 'bmn_khusus_tik.json',
  non_tik: 'bmn_non_tik.json',
};

function getBmnFromJson(category: BmnCategoryType): BmnAssetItem[] {
  const fileName = categoryJsonMap[category];
  const jsonPath = resolve(process.cwd(), 'db', 'export', fileName);
  if (!existsSync(jsonPath)) return [];
  try {
    return JSON.parse(readFileSync(jsonPath, 'utf8')) as BmnAssetItem[];
  } catch (err) {
    logger.warn(`Gagal membaca ${fileName}`, 'bmn', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function getBmnAssetsFromDb(
  category: BmnCategoryType,
  kodeSatker?: string | null,
  universityName?: string | null
): Promise<BmnAssetItem[]> {
  const tableName = categoryTableMap[category];
  let items: BmnAssetItem[] = [];
  try {
    if (kodeSatker) {
      const res = await query<BmnAssetItem>(
        `select id, jenis_bmn, kode_satker, nama_satker, kode_barang, nup, nama_barang,
                status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn,
                latitude, longitude, alamat_lokasi, created_at, updated_at
         from ${tableName}
         where (kode_satker = $1 or ($2::text is not null and lower(nama_satker) = lower($2::text)))
           and is_deleted = 0
         order by id desc`,
        [kodeSatker, universityName || null]
      );
      if (res.rows && res.rows.length > 0) {
        items = res.rows;
      }
    } else {
      const res = await query<BmnAssetItem>(
        `select id, jenis_bmn, kode_satker, nama_satker, kode_barang, nup, nama_barang,
                status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn,
                latitude, longitude, alamat_lokasi, created_at, updated_at
         from ${tableName}
         where is_deleted = 0
         order by id desc`
      );
      if (res.rows && res.rows.length > 0) {
        items = res.rows;
      }
    }
  } catch (err) {
    logger.warn(`Gagal mengambil data ${tableName} dari PostgreSQL, menggunakan fallback JSON`, 'bmn', { error: err instanceof Error ? err.message : String(err) });
  }

  if (items.length === 0) {
    items = getBmnFromJson(category);
  }

  if (kodeSatker || universityName) {
    return items.filter(
      (item) =>
        (kodeSatker && item.kode_satker === kodeSatker) ||
        (universityName && item.nama_satker?.toLowerCase() === universityName.toLowerCase())
    );
  }

  return items;
}

export async function upsertBmnAssetToDb(
  category: BmnCategoryType,
  item: Partial<BmnAssetItem>
): Promise<BmnAssetItem> {
  const tableName = categoryTableMap[category];
  
  if (item.id && item.id > 0) {
    // Update
    const res = await query<BmnAssetItem>(
      `update ${tableName}
       set jenis_bmn = $1, kode_satker = $2, nama_satker = $3, kode_barang = $4, nup = $5,
           nama_barang = $6, status_bmn = $7, merk = $8, tipe = $9, kondisi = $10,
           umur_aset = $11, intra_extra = $12, henti_guna = $13, status_sbsn = $14,
           latitude = $15, longitude = $16, alamat_lokasi = $17,
           updated_at = now()
       where id = $18
       returning *`,
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
        item.umur_aset ?? 0,
        item.intra_extra || 'Intra',
        item.henti_guna || 'Tidak',
        item.status_sbsn || null,
        item.latitude ?? null,
        item.longitude ?? null,
        item.alamat_lokasi || null,
        item.id,
      ]
    );
    if (res.rows[0]) return res.rows[0];
  }

  // Insert
  const res = await query<BmnAssetItem>(
    `insert into ${tableName} (
       jenis_bmn, kode_satker, nama_satker, kode_barang, nup, nama_barang,
       status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn,
       latitude, longitude, alamat_lokasi
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     returning *`,
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
      item.umur_aset ?? 0,
      item.intra_extra || 'Intra',
      item.henti_guna || 'Tidak',
      item.status_sbsn || null,
      item.latitude ?? null,
      item.longitude ?? null,
      item.alamat_lokasi || null,
    ]
  );

  return res.rows[0];
}

export async function deleteBmnAssetFromDb(category: BmnCategoryType, id: number): Promise<boolean> {
  const tableName = categoryTableMap[category];
  const res = await query(`update ${tableName} set is_deleted = 1, updated_at = now() where id = $1 and is_deleted = 0`, [id]);
  return (res.rowCount ?? 0) > 0;
}
