import 'server-only';
import { query } from '@/lib/server/db';
import { parseJson } from '@/lib/server/repositories/asset-repository';
import type { Utilization } from '@/lib/types';

export function parseUtilizationMeta(value: unknown): Partial<Utilization> {
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

export function normalizeUtilization(row: Record<string, unknown>): Utilization {
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

export async function getUtilizationsFromDb(): Promise<Utilization[]> {
  const { rows } = await query('select * from asset_utilizations order by id asc');
  return rows.map((row) => normalizeUtilization(row));
}

export async function upsertUtilizationToDb(utilization: Utilization, isNew = false): Promise<Utilization> {
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

export async function deleteUtilizationFromDb(utilizationId: number): Promise<void> {
  await query('delete from asset_utilizations where id = $1', [utilizationId]);
}
