import 'server-only';
import { query, transaction } from '@/lib/server/db';
import { resolveUserRole } from '@/lib/role-utils';
import type { Asset, AssetIssue, DashboardSummary, Utilization } from '@/lib/types';

function parseJson(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value ?? null;
}

function normalizeAsset(row: Record<string, unknown>): Asset {
  const photoPaths = Array.isArray(row.photo_paths) ? row.photo_paths as string[] : [];
  const photoUrls = Array.isArray(row.photo_urls) ? row.photo_urls as string[] : [];
  const documentPaths = Array.isArray(row.document_paths) ? row.document_paths as string[] : [];
  return {
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
  };
}

function parseUtilizationMeta(value: unknown): Partial<Utilization> {
  const parsed = parseJson(value) as Partial<Utilization> | null;
  if (!parsed) return {};
  return {
    pks_document_name: parsed.pks_document_name ?? null,
    pks_document_path: parsed.pks_document_path ?? null,
    pks_document_url: parsed.pks_document_path ? `/uploads/${parsed.pks_document_path}` : null,
    geometry_geojson: parsed.geometry_geojson ?? null,
    use_full_asset_area: parsed.use_full_asset_area ?? false,
    photo_names: parsed.photo_names ?? [],
    photo_paths: parsed.photo_paths ?? [],
    photo_urls: parsed.photo_urls ?? [],
  };
}

function normalizeUtilization(row: Record<string, unknown>): Utilization {
  return {
    id: Number(row.id),
    asset_id: Number(row.asset_id),
    third_party_name: String(row.third_party_name ?? ''),
    utilization_type: String(row.utilization_type ?? ''),
    start_date: String(row.start_date ?? ''),
    end_date: String(row.end_date ?? ''),
    status: String(row.status ?? 'draft'),
    utilized_area_m2: row.utilized_area_m2 === null || row.utilized_area_m2 === undefined ? null : Number(row.utilized_area_m2),
    ...parseUtilizationMeta(row.description),
  };
}

function normalizeIssue(row: Record<string, unknown>): AssetIssue {
  return {
    id: Number(row.id),
    asset_id: Number(row.asset_id),
    issue_title: String(row.issue_title ?? ''),
    issue_type: String(row.issue_type ?? ''),
    priority: String(row.priority ?? 'sedang'),
    status: String(row.status ?? 'dicatat'),
    found_date: row.found_date ? String(row.found_date).slice(0, 10) : null,
  };
}

export async function getAssetsFromDb(): Promise<Asset[]> {
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
    group by a.id
    order by a.id asc
  `);
  return rows.map((row) => normalizeAsset(row));
}

export async function getIssuesFromDb() {
  const { rows } = await query('select * from asset_issues order by id asc');
  return rows.map((row) => normalizeIssue(row));
}

export async function getUtilizationsFromDb() {
  const { rows } = await query('select * from asset_utilizations order by id asc');
  return rows.map((row) => normalizeUtilization(row));
}

export async function getDashboardSummaryFromDb(): Promise<DashboardSummary> {
  const assets = await getAssetsFromDb();
  const issues = await getIssuesFromDb();
  const utilizations = await getUtilizationsFromDb();
  return {
    total_land: assets.filter((asset) => asset.asset_type === 'land').length,
    total_building: assets.filter((asset) => asset.asset_type === 'building').length,
    total_land_area_m2: 0,
    total_building_area_m2: 0,
    verified_assets: assets.filter((asset) => asset.verification_status === 'terverifikasi').length,
    pending_verification: assets.filter((asset) => asset.verification_status === 'menunggu_verifikasi').length,
    active_utilizations: utilizations.filter((item) => ['aktif', 'akan_berakhir'].includes(item.status)).length,
    active_issues: issues.filter((issue) => issue.status !== 'selesai').length,
  };
}

export async function getMvpDataFromDb() {
  const [assets, summary, utilizations, issues] = await Promise.all([
    getAssetsFromDb(),
    getDashboardSummaryFromDb(),
    getUtilizationsFromDb(),
    getIssuesFromDb(),
  ]);
  return { assets, summary, utilizations, issues };
}

export async function upsertAssetToDb(asset: Asset) {
  return transaction(async (client) => {
    const { rows } = await client.query(`
      insert into assets (id, asset_code, asset_name, asset_type, campus_name, faculty_or_unit, address, ownership_status, condition_status, verification_status, latitude, longitude, geometry_type, geometry_geojson)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      on conflict (id) do update set asset_code=excluded.asset_code, asset_name=excluded.asset_name, asset_type=excluded.asset_type, campus_name=excluded.campus_name, faculty_or_unit=excluded.faculty_or_unit, address=excluded.address, ownership_status=excluded.ownership_status, condition_status=excluded.condition_status, verification_status=excluded.verification_status, latitude=excluded.latitude, longitude=excluded.longitude, geometry_type=excluded.geometry_type, geometry_geojson=excluded.geometry_geojson, updated_at=now()
      returning *
    `, [asset.id, asset.asset_code, asset.asset_name, asset.asset_type, asset.campus_name, asset.faculty_or_unit, asset.address, asset.ownership_status, asset.condition_status, asset.verification_status, asset.latitude, asset.longitude, asset.geometry_type, asset.geometry_geojson ? JSON.stringify(asset.geometry_geojson) : null]);
    return normalizeAsset({ ...rows[0], photo_paths: asset.photo_paths ?? [], photo_urls: asset.photo_urls ?? [], photo_names: asset.photo_names ?? [], document_paths: asset.document_paths ?? [], document_names: asset.document_names ?? [] });
  });
}

export async function deleteAssetFromDb(assetId: number) {
  await query('delete from assets where id = $1', [assetId]);
}

export async function upsertIssueToDb(issue: AssetIssue, isNew = false) {
  const { rows } = isNew
    ? await query('insert into asset_issues (asset_id, issue_title, issue_type, priority, status, found_date) values ($1,$2,$3,$4,$5,$6) returning *', [issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, issue.found_date])
    : await query('insert into asset_issues (id, asset_id, issue_title, issue_type, priority, status, found_date) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do update set asset_id=excluded.asset_id, issue_title=excluded.issue_title, issue_type=excluded.issue_type, priority=excluded.priority, status=excluded.status, found_date=excluded.found_date, updated_at=now() returning *', [issue.id, issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, issue.found_date]);
  return normalizeIssue(rows[0]);
}

export async function deleteIssueFromDb(issueId: number) {
  await query('delete from asset_issues where id = $1', [issueId]);
}

export async function upsertUtilizationToDb(utilization: Utilization, isNew = false) {
  const description = JSON.stringify({
    pks_document_name: utilization.pks_document_name ?? null,
    pks_document_path: utilization.pks_document_path ?? null,
    geometry_geojson: utilization.geometry_geojson ?? null,
    use_full_asset_area: utilization.use_full_asset_area ?? false,
    photo_names: utilization.photo_names ?? [],
    photo_paths: utilization.photo_paths ?? [],
    photo_urls: utilization.photo_urls ?? [],
  });
  const params = [utilization.asset_id, utilization.third_party_name, utilization.utilization_type, utilization.start_date, utilization.end_date, utilization.status, utilization.utilized_area_m2 ?? null, description];
  const { rows } = isNew
    ? await query('insert into asset_utilizations (asset_id, third_party_name, utilization_type, start_date, end_date, status, utilized_area_m2, description) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *', params)
    : await query('insert into asset_utilizations (id, asset_id, third_party_name, utilization_type, start_date, end_date, status, utilized_area_m2, description) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do update set asset_id=excluded.asset_id, third_party_name=excluded.third_party_name, utilization_type=excluded.utilization_type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, utilized_area_m2=excluded.utilized_area_m2, description=excluded.description, updated_at=now() returning *', [utilization.id, ...params]);
  return normalizeUtilization(rows[0]);
}

export async function deleteUtilizationFromDb(utilizationId: number) {
  await query('delete from asset_utilizations where id = $1', [utilizationId]);
}

export async function findUserForLogin(email: string) {
  const { rows } = await query(`
    select p.id, p.email, p.full_name, p.status, p.university_name, p.password_hash, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    where lower(p.email) = lower($1)
    limit 1
  `, [email]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name ?? row.email),
    status: row.status === 'nonaktif' ? 'nonaktif' as const : 'aktif' as const,
    university_name: row.university_name as string | null,
    role: resolveUserRole(row.role_name),
    password_hash: row.password_hash as string | null,
  };
}
