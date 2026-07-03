import 'server-only';
import { query, transaction } from '@/lib/server/db';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { resolveUserRole } from '@/lib/role-utils';
import type { Asset, AssetIssue, DashboardSummary, IssueProgress, Utilization } from '@/lib/types';

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

function normalizeIssueProgress(row: Record<string, unknown>): IssueProgress {
  const documentPath = row.document_path as string | null;
  const documentUrl = row.document_url as string | null;
  return {
    id: Number(row.id),
    issue_id: Number(row.issue_id),
    progress_date: row.progress_date ? String(row.progress_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    progress_description: String(row.progress_description ?? ''),
    responsible_person: row.responsible_person as string | null,
    result_note: row.result_note as string | null,
    status: String(row.status ?? 'dicatat'),
    document_name: row.document_name as string | null,
    document_path: documentPath,
    document_url: documentUrl ?? (documentPath ? `/uploads/${documentPath}` : null),
  };
}

async function ensureIssueProgressUploadColumns(client?: { query: (text: string, params?: unknown[]) => Promise<unknown> }) {
  const runner = client ?? { query };
  await runner.query('alter table issue_progress add column if not exists document_name text');
  await runner.query('alter table issue_progress add column if not exists document_path text');
  await runner.query('alter table issue_progress add column if not exists document_url text');
  await runner.query('alter table issue_progress add column if not exists updated_at timestamptz');
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

    return normalizeAsset({ ...rows[0], photo_paths: photoPaths, photo_urls: photoPaths.map((photoPath, index) => photoUrls[index] ?? `/uploads/${photoPath}`), photo_names: photoNames, document_paths: documentPaths, document_names: documentNames });
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

export async function getIssueProgressFromDb() {
  await ensureIssueProgressUploadColumns();
  const { rows } = await query('select * from issue_progress order by progress_date desc, id desc');
  return rows.map((row) => normalizeIssueProgress(row));
}

export async function upsertIssueProgressToDb(progress: IssueProgress) {
  return transaction(async (client) => {
    await ensureIssueProgressUploadColumns(client);
    const { rows } = await client.query(
      'insert into issue_progress (issue_id, progress_date, progress_description, responsible_person, result_note, status, document_name, document_path, document_url) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
      [progress.issue_id, progress.progress_date, progress.progress_description, progress.responsible_person ?? null, progress.result_note ?? null, progress.status, progress.document_name ?? null, progress.document_path ?? null, progress.document_url ?? (progress.document_path ? `/uploads/${progress.document_path}` : null)]
    );
    return normalizeIssueProgress(rows[0]);
  });
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

export async function updateOwnPassword(userId: string, currentPassword: string, nextPassword: string) {
  const { rows } = await query('select id, password_hash from profiles where id = $1 limit 1', [userId]);
  const row = rows[0];
  if (!row) return { ok: false as const, error: 'User tidak ditemukan.' };
  if (!verifyPassword(currentPassword, row.password_hash as string | null)) {
    return { ok: false as const, error: 'Password saat ini tidak sesuai.' };
  }

  await query('update profiles set password_hash = $1, updated_at = now() where id = $2', [hashPassword(nextPassword), userId]);
  return { ok: true as const };
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
