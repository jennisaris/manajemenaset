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

export async function ensureAssetColumns() {
  await query('alter table assets add column if not exists status_sertifikasi text');
  await query('alter table assets add column if not exists nilai_perolehan_pertama numeric');
  await query('alter table assets add column if not exists luas_bangunan numeric');
  await query('alter table assets add column if not exists no_psp text');
  await query('alter table assets add column if not exists alamat text');
  await query('alter table assets add column if not exists kode_satker text');
  await query('alter table assets add column if not exists nama_satker text');
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
    address: (row.address as string) || (row.alamat as string) || null,
    alamat: (row.alamat as string) || (row.address as string) || null,
    ownership_status: (row.ownership_status as string) || (row.status_sertifikasi as string) || null,
    status_sertifikasi: (row.status_sertifikasi as string) || (row.ownership_status as string) || null,
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
    nilai_perolehan_pertama: row.nilai_perolehan_pertama !== null && row.nilai_perolehan_pertama !== undefined ? Number(row.nilai_perolehan_pertama) : (row.nilai_perolehan !== null && row.nilai_perolehan !== undefined ? Number(row.nilai_perolehan) : null),
    luas_bangunan: row.luas_bangunan !== null && row.luas_bangunan !== undefined ? Number(row.luas_bangunan) : null,
    no_psp: row.no_psp ? String(row.no_psp) : null,
  };
}

export type BatchInsertResult = { query: string; params: unknown[] };

export function buildPhotoBatchInsert(
  assetId: number,
  photoPaths: string[],
  photoUrls: string[],
  photoNames: string[]
): BatchInsertResult {
  if (!photoPaths || photoPaths.length === 0) {
    return { query: '', params: [] };
  }
  const valueTuples: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (let i = 0; i < photoPaths.length; i++) {
    const photoPath = photoPaths[i];
    const photoUrl = photoUrls[i] ?? `/uploads/${photoPath}`;
    const caption = photoNames[i] ?? photoPath.split('/').pop() ?? 'Foto Aset';
    const isPrimary = i === 0;

    valueTuples.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
    params.push(assetId, photoPath, photoUrl, caption, isPrimary);
    paramIdx += 5;
  }

  const query = `
    insert into asset_photos (asset_id, photo_path, photo_url, caption, is_primary)
    values ${valueTuples.join(', ')}
    on conflict (asset_id, photo_path) do update set
      photo_url=excluded.photo_url, caption=excluded.caption, is_primary=excluded.is_primary
  `.trim();

  return { query, params };
}

export function buildDocumentBatchInsert(
  assetId: number,
  documentPaths: string[],
  documentNames: string[]
): BatchInsertResult {
  if (!documentPaths || documentPaths.length === 0) {
    return { query: '', params: [] };
  }
  const valueTuples: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (let i = 0; i < documentPaths.length; i++) {
    const file_path = documentPaths[i];
    const document_name = documentNames[i] ?? file_path.split('/').pop() ?? 'Dokumen Aset';

    valueTuples.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
    params.push(assetId, document_name, file_path);
    paramIdx += 3;
  }

  const query = `
    insert into asset_documents (asset_id, document_name, file_path)
    values ${valueTuples.join(', ')}
    on conflict (asset_id, file_path) do update set
      document_name=excluded.document_name
  `.trim();

  return { query, params };
}

export type AssetListOptions = {
  limit?: number;
  offset?: number;
  search?: string;
  asset_type?: 'land' | 'building' | string;
  verification_status?: string;
  kode_satker?: string;
};

export function buildAssetFilterClauses(options: AssetListOptions = {}): { whereClause: string; params: unknown[] } {
  const conditions = ['coalesce(a.is_deleted, 0) = 0'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options.search && options.search.trim()) {
    conditions.push(`(a.asset_name ilike $${paramIdx} or a.asset_code ilike $${paramIdx} or coalesce(a.campus_name, '') ilike $${paramIdx} or coalesce(a.nama_satker, '') ilike $${paramIdx})`);
    params.push(`%${options.search.trim()}%`);
    paramIdx++;
  }

  if (options.asset_type && (options.asset_type === 'land' || options.asset_type === 'building')) {
    conditions.push(`a.asset_type = $${paramIdx}`);
    params.push(options.asset_type);
    paramIdx++;
  }

  if (options.verification_status && options.verification_status.trim()) {
    conditions.push(`a.verification_status = $${paramIdx}`);
    params.push(options.verification_status.trim());
    paramIdx++;
  }

  if (options.kode_satker && options.kode_satker.trim()) {
    conditions.push(`a.kode_satker = $${paramIdx}`);
    params.push(options.kode_satker.trim());
    paramIdx++;
  }

  return {
    whereClause: conditions.join(' and '),
    params,
  };
}

export async function getAssetCountFromDb(options: AssetListOptions = {}): Promise<number> {
  const { whereClause, params } = buildAssetFilterClauses(options);
  const { rows } = await query(`select count(*)::bigint as total from assets a where ${whereClause}`, params);
  return Number(rows[0]?.total ?? 0);
}

export async function getAssetsFromDb(options: AssetListOptions = {}): Promise<Asset[]> {
  const { whereClause, params } = buildAssetFilterClauses(options);
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100000) : 100000;
  const offset = Math.max(0, options.offset ?? 0);
  const limitParamIdx = params.length + 1;
  const offsetParamIdx = params.length + 2;
  const queryParams = [...params, limit, offset];

  const { rows } = await query(`
    select a.*,
      coalesce(ap.photo_paths, '{}') as photo_paths,
      coalesce(ap.photo_urls, '{}') as photo_urls,
      coalesce(ap.photo_names, '{}') as photo_names,
      coalesce(ad.document_paths, '{}') as document_paths,
      coalesce(ad.document_names, '{}') as document_names,
      exists(select 1 from asset_issues ai where ai.asset_id = a.id and ai.status <> 'selesai') as has_active_issue,
      exists(select 1 from asset_utilizations au where au.asset_id = a.id and au.status in ('aktif','akan_berakhir')) as has_active_utilization
    from assets a
    left join lateral (
      select
        array_remove(array_agg(p.photo_path), null) as photo_paths,
        array_remove(array_agg(p.photo_url), null) as photo_urls,
        array_remove(array_agg(p.caption), null) as photo_names
      from asset_photos p
      where p.asset_id = a.id
    ) ap on true
    left join lateral (
      select
        array_remove(array_agg(d.file_path), null) as document_paths,
        array_remove(array_agg(d.document_name), null) as document_names
      from asset_documents d
      where d.asset_id = a.id
    ) ad on true
    where ${whereClause}
    order by a.id asc
    limit $${limitParamIdx} offset $${offsetParamIdx}
  `, queryParams);
  return rows.map((row) => normalizeAsset(row));
}

export async function upsertAssetToDb(asset: Asset): Promise<Asset> {
  await ensureAssetColumns();
  return transaction(async (client) => {
    const { rows } = await client.query(`
      insert into assets (
        id, asset_code, asset_name, asset_type, campus_name, faculty_or_unit, address,
        ownership_status, condition_status, verification_status, latitude, longitude,
        geometry_type, geometry_geojson, is_deleted, status_sertifikasi,
        nilai_perolehan_pertama, luas_bangunan, no_psp, alamat, kode_satker, nama_satker
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      on conflict (id) do update set
        asset_code=excluded.asset_code,
        asset_name=excluded.asset_name,
        asset_type=excluded.asset_type,
        campus_name=excluded.campus_name,
        faculty_or_unit=excluded.faculty_or_unit,
        address=excluded.address,
        ownership_status=excluded.ownership_status,
        condition_status=excluded.condition_status,
        verification_status=excluded.verification_status,
        latitude=excluded.latitude,
        longitude=excluded.longitude,
        geometry_type=excluded.geometry_type,
        geometry_geojson=excluded.geometry_geojson,
        is_deleted=excluded.is_deleted,
        status_sertifikasi=excluded.status_sertifikasi,
        nilai_perolehan_pertama=excluded.nilai_perolehan_pertama,
        luas_bangunan=excluded.luas_bangunan,
        no_psp=excluded.no_psp,
        alamat=excluded.alamat,
        kode_satker=excluded.kode_satker,
        nama_satker=excluded.nama_satker,
        updated_at=now()
      returning *
    `, [
      asset.id,
      asset.asset_code,
      asset.asset_name,
      asset.asset_type,
      asset.campus_name,
      asset.faculty_or_unit,
      asset.address ?? asset.alamat ?? null,
      asset.ownership_status ?? asset.status_sertifikasi ?? null,
      asset.condition_status,
      asset.verification_status ?? 'terverifikasi',
      asset.latitude,
      asset.longitude,
      asset.geometry_type,
      asset.geometry_geojson ? JSON.stringify(asset.geometry_geojson) : null,
      asset.is_deleted ?? 0,
      asset.status_sertifikasi ?? asset.ownership_status ?? null,
      asset.nilai_perolehan_pertama ?? asset.nilai_perolehan ?? null,
      asset.luas_bangunan ?? null,
      asset.no_psp ?? null,
      asset.alamat ?? asset.address ?? null,
      asset.kode_satker ?? null,
      asset.nama_satker ?? null,
    ]);

    const savedAssetId = Number(rows[0].id);
    const photoPaths = asset.photo_paths ?? [];
    const photoUrls = asset.photo_urls ?? [];
    const photoNames = asset.photo_names ?? [];
    const documentPaths = asset.document_paths ?? [];
    const documentNames = asset.document_names ?? [];

    await client.query('delete from asset_photos where asset_id = $1', [savedAssetId]);
    const photoBatch = buildPhotoBatchInsert(savedAssetId, photoPaths, photoUrls, photoNames);
    if (photoBatch.query) {
      await client.query(photoBatch.query, photoBatch.params);
    }

    await client.query('delete from asset_documents where asset_id = $1', [savedAssetId]);
    const docBatch = buildDocumentBatchInsert(savedAssetId, documentPaths, documentNames);
    if (docBatch.query) {
      await client.query(docBatch.query, docBatch.params);
    }

    await client.query("select setval('assets_id_seq', (select max(id) from assets))");

    return normalizeAsset({ ...rows[0], photo_paths: photoPaths, photo_urls: photoPaths.map((photoPath, index) => photoUrls[index] ?? `/uploads/${photoPath}`), photo_names: photoNames, document_paths: documentPaths, document_names: documentNames });
  });
}

export async function deleteAssetFromDb(assetId: number): Promise<void> {
  // Soft Delete: Mengubah is_deleted dari 0 menjadi 1 tanpa menghapus fisik row dari database
  await query("update assets set is_deleted = 1, verification_status = 'tidak_aktif', updated_at = now() where id = $1", [assetId]);
}
