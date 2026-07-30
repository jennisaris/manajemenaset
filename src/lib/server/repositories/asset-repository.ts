import 'server-only';
import { query, transaction } from '@/lib/server/db';
import type { Asset } from '@/lib/types';

export function parseJson(value: unknown) {
  if (typeof value === 'object' && value !== null) return value;
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value ?? null;
}

export function normalizeAsset(row: Record<string, unknown>): Asset {
  const photoPaths = Array.isArray(row.photo_paths) ? row.photo_paths as string[] : [];
  const photoUrls = Array.isArray(row.photo_urls) ? row.photo_urls as string[] : [];
  const documentPaths = Array.isArray(row.document_paths) ? row.document_paths as string[] : [];
  return {
    ...row,
    id: Number(row.id),
    asset_code: String(row.asset_code ?? ''),
    asset_name: String(row.asset_name ?? ''),
    asset_type: row.asset_type === 'land' ? 'land' : 'building',
    campus_name: row.campus_name as string | null,
    faculty_or_unit: row.faculty_or_unit as string | null,
    address: row.address as string | null,
    ownership_status: row.ownership_status as string | null,
    condition_status: row.condition_status as string | null,
    verification_status: (row.verification_status as Asset['verification_status']) ?? 'draft',
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    geometry_type: row.geometry_type as Asset['geometry_type'],
    geometry_geojson: parseJson(row.geometry_geojson) as GeoJSON.Geometry | null,
    primary_photo_path: photoPaths[0] ?? null,
    primary_photo_url: photoUrls[0] ?? null,
    photo_paths: photoPaths,
    photo_urls: photoUrls,
    photo_names: Array.isArray(row.photo_names) ? row.photo_names as string[] : [],
    document_paths: documentPaths,
    document_names: Array.isArray(row.document_names) ? row.document_names as string[] : [],
    document_urls: Array.isArray(row.document_urls) ? row.document_urls as string[] : documentPaths.map((path) => `/uploads/${path}`),
    has_active_issue: Boolean(row.has_active_issue),
    has_active_utilization: Boolean(row.has_active_utilization),
    is_deleted: Number(row.is_deleted ?? 0),
    bmn_raw: parseJson(row.bmn_raw) as Record<string, unknown> | null,
  };
}

export type AssetListOptions = { limit?: number; offset?: number };

export async function getAssetCountFromDb(): Promise<number> {
  const { rows } = await query('select count(*)::bigint as total from assets where coalesce(is_deleted, 0) = 0');
  return Number(rows[0]?.total ?? 0);
}

export async function getAssetsFromDb(options: AssetListOptions = {}): Promise<Asset[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 300, 1000));
  const offset = Math.max(0, options.offset ?? 0);
  const { rows } = await query(`
    select a.*,
      coalesce(array_remove(array_agg(distinct ap.photo_path), null), '{}') as photo_paths,
      coalesce(array_remove(array_agg(distinct ap.photo_url), null), '{}') as photo_urls,
      coalesce(array_remove(array_agg(distinct ap.caption), null), '{}') as photo_names,
      coalesce(array_remove(array_agg(distinct ad.file_path), null), '{}') as document_paths,
      coalesce(array_remove(array_agg(distinct ad.document_name), null), '{}') as document_names,
      exists(select 1 from asset_issues ai where ai.asset_id = a.id and ai.status <> 'selesai') as has_active_issue,
      exists(select 1 from asset_utilizations au where au.asset_id = a.id and au.status in ('aktif','akan_berakhir')) as has_active_utilization
    from assets a
    left join asset_photos ap on ap.asset_id = a.id
    left join asset_documents ad on ad.asset_id = a.id
    where coalesce(a.is_deleted, 0) = 0
    group by a.id
    order by a.id asc
    limit $1 offset $2
  `, [limit, offset]);
  return rows.map((row) => normalizeAsset(row));
}

export async function upsertAssetToDb(asset: Asset): Promise<Asset> {
  return transaction(async (client) => {
    const { rows } = await client.query(`
      insert into assets (id, asset_code, asset_name, asset_type, campus_name, faculty_or_unit, address, ownership_status, condition_status, verification_status, latitude, longitude, geometry_type, geometry_geojson, is_deleted)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      on conflict (id) do update set asset_code=excluded.asset_code, asset_name=excluded.asset_name, asset_type=excluded.asset_type, campus_name=excluded.campus_name, faculty_or_unit=excluded.faculty_or_unit, address=excluded.address, ownership_status=excluded.ownership_status, condition_status=excluded.condition_status, verification_status=excluded.verification_status, latitude=excluded.latitude, longitude=excluded.longitude, geometry_type=excluded.geometry_type, geometry_geojson=excluded.geometry_geojson, is_deleted=excluded.is_deleted, updated_at=now()
      returning *
    `, [asset.id, asset.asset_code, asset.asset_name, asset.asset_type, asset.campus_name, asset.faculty_or_unit, asset.address, asset.ownership_status, asset.condition_status, asset.verification_status, asset.latitude, asset.longitude, asset.geometry_type, asset.geometry_geojson ? JSON.stringify(asset.geometry_geojson) : null, asset.is_deleted ?? 0]);

    const savedAssetId = Number(rows[0].id);
    const photoPaths = asset.photo_paths ?? [];
    const photoUrls = asset.photo_urls ?? [];
    const photoNames = asset.photo_names ?? [];
    const documentPaths = asset.document_paths ?? [];
    const documentNames = asset.document_names ?? [];

    await client.query('delete from asset_photos where asset_id = $1', [savedAssetId]);
    for (const [index, photoPath] of photoPaths.entries()) {
      await client.query(
        'insert into asset_photos (asset_id, photo_path, photo_url, caption, is_primary) values ($1,$2,$3,$4,$5) on conflict (asset_id, photo_path) do update set photo_url=excluded.photo_url, caption=excluded.caption, is_primary=excluded.is_primary',
        [savedAssetId, photoPath, photoUrls[index] ?? `/uploads/${photoPath}`, photoNames[index] ?? photoPath.split('/').pop() ?? 'Foto Aset', index === 0]
      );
    }

    await client.query('delete from asset_documents where asset_id = $1', [savedAssetId]);
    for (const [index, documentPath] of documentPaths.entries()) {
      await client.query(
        'insert into asset_documents (asset_id, document_name, file_path) values ($1,$2,$3) on conflict (asset_id, file_path) do update set document_name=excluded.document_name',
        [savedAssetId, documentNames[index] ?? documentPath.split('/').pop() ?? 'Dokumen Aset', documentPath]
      );
    }

    await client.query("select setval('assets_id_seq', (select max(id) from assets))");

    return normalizeAsset({ ...rows[0], photo_paths: photoPaths, photo_urls: photoPaths.map((photoPath, index) => photoUrls[index] ?? `/uploads/${photoPath}`), photo_names: photoNames, document_paths: documentPaths, document_names: documentNames });
  });
}

export async function deleteAssetFromDb(assetId: number): Promise<void> {
  // Soft Delete: Mengubah is_deleted dari 0 menjadi 1 tanpa menghapus fisik row dari database
  await query("update assets set is_deleted = 1, verification_status = 'tidak_aktif', updated_at = now() where id = $1", [assetId]);
}
