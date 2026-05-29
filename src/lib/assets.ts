import { mockAssets, mockIssues, mockSummary, mockUtilizations } from './mock-data';
import { createAssetDocumentPreviewUrls, createAssetPhotoPreviewUrl } from './storage';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Asset, AssetIssue, DashboardSummary, Utilization } from './types';

function getSupabase() {
  return isSupabaseConfigured ? supabase : null;
}

export async function getAssets(): Promise<Asset[]> {
  const supabase = getSupabase();
  if (!supabase) return mockAssets;
  const [{ data, error }, { data: issues }, { data: utilizations }, { data: documents }, { data: photos }] = await Promise.all([
    supabase.from('assets').select('*').order('id', { ascending: true }),
    supabase.from('asset_issues').select('asset_id,status'),
    supabase.from('asset_utilizations').select('asset_id,status'),
    supabase.from('asset_documents').select('asset_id,document_name,file_path').order('id', { ascending: true }),
    supabase.from('asset_photos').select('asset_id,photo_path,photo_url,caption,is_primary').order('id', { ascending: true }),
  ]);
  if (error || !data) return [];

  const documentsByAsset = new Map<number, { names: string[]; paths: string[]; urls: string[] }>();
  const photosByAsset = new Map<number, { names: string[]; paths: string[]; urls: string[] }>();
  await Promise.all((data as { id: number }[]).map(async (asset) => {
    const assetDocuments = documents?.filter((document) => document.asset_id === asset.id) ?? [];
    const paths = assetDocuments.map((document) => document.file_path).filter(Boolean);
    const urls = await createAssetDocumentPreviewUrls(paths);
    documentsByAsset.set(asset.id, {
      names: assetDocuments.map((document) => document.document_name ?? document.file_path.split('/').pop() ?? 'Dokumen Aset'),
      paths,
      urls: urls.filter((url): url is string => Boolean(url)),
    });

    const assetPhotos = photos?.filter((photo) => photo.asset_id === asset.id) ?? [];
    photosByAsset.set(asset.id, {
      names: assetPhotos.map((photo) => photo.caption ?? photo.photo_path.split('/').pop() ?? 'Foto Aset'),
      paths: assetPhotos.map((photo) => photo.photo_path).filter(Boolean),
      urls: assetPhotos
        .map((photo) => createAssetPhotoPreviewUrl(photo.photo_path) ?? (photo.photo_url?.startsWith('http') ? photo.photo_url : null))
        .filter((url): url is string => Boolean(url)),
    });
  }));

  return data.map((asset) => {
    const assetDocuments = documentsByAsset.get(asset.id);
    const assetPhotos = photosByAsset.get(asset.id);
    return {
      ...asset,
      latitude: asset.latitude === null ? null : Number(asset.latitude),
      longitude: asset.longitude === null ? null : Number(asset.longitude),
      primary_photo_url: assetPhotos?.urls[0] ?? null,
      primary_photo_path: assetPhotos?.paths[0] ?? null,
      photo_names: assetPhotos?.names ?? [],
      photo_paths: assetPhotos?.paths ?? [],
      photo_urls: assetPhotos?.urls ?? [],
      document_names: assetDocuments?.names ?? [],
      document_paths: assetDocuments?.paths ?? [],
      document_urls: assetDocuments?.urls ?? [],
      has_active_issue: issues?.some((issue) => issue.asset_id === asset.id && issue.status !== 'selesai') ?? false,
      has_active_utilization: utilizations?.some((item) => item.asset_id === asset.id && ['aktif', 'akan_berakhir'].includes(item.status)) ?? false,
    };
  }) as Asset[];
}

export async function getIssues(): Promise<AssetIssue[]> {
  const supabase = getSupabase();
  if (!supabase) return mockIssues;
  const { data, error } = await supabase.from('asset_issues').select('*').order('id', { ascending: true });
  if (error || !data) return [];
  return data as AssetIssue[];
}

export async function getUtilizations(): Promise<Utilization[]> {
  const supabase = getSupabase();
  if (!supabase) return mockUtilizations;
  const { data, error } = await supabase
    .from('asset_utilizations')
    .select('id,asset_id,third_party_name,utilization_type,start_date,end_date,status,utilized_area_m2,description')
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => {
    let pksMeta: Partial<Utilization> = {};
    if (typeof row.description === 'string' && row.description.trim()) {
      try {
        const parsed = JSON.parse(row.description) as Partial<Utilization>;
        pksMeta = {
          pks_document_name: parsed.pks_document_name ?? null,
          pks_document_path: parsed.pks_document_path ?? null,
          geometry_geojson: parsed.geometry_geojson ?? null,
          use_full_asset_area: parsed.use_full_asset_area ?? false,
          photo_names: parsed.photo_names ?? [],
          photo_paths: parsed.photo_paths ?? [],
          photo_urls: parsed.photo_urls ?? [],
        };
      } catch {
        pksMeta = {};
      }
    }
    return { ...row, ...pksMeta } as Utilization;
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const assets = await getAssets();
  const supabase = getSupabase();
  if (!supabase) return mockSummary;
  const [{ data: lands }, { data: buildings }, { data: utilizations }, { data: issues }] = await Promise.all([
    supabase.from('land_assets').select('land_area_m2'),
    supabase.from('building_assets').select('building_area_m2'),
    supabase.from('asset_utilizations').select('status'),
    supabase.from('asset_issues').select('status'),
  ]);
  return {
    total_land: assets.filter((asset) => asset.asset_type === 'land').length,
    total_building: assets.filter((asset) => asset.asset_type === 'building').length,
    total_land_area_m2: lands?.reduce((total, row) => total + Number(row.land_area_m2 ?? 0), 0) ?? 0,
    total_building_area_m2: buildings?.reduce((total, row) => total + Number(row.building_area_m2 ?? 0), 0) ?? 0,
    verified_assets: assets.filter((asset) => asset.verification_status === 'terverifikasi').length,
    pending_verification: assets.filter((asset) => asset.verification_status === 'menunggu_verifikasi').length,
    active_utilizations: utilizations?.filter((item) => ['aktif', 'akan_berakhir'].includes(item.status)).length ?? 0,
    active_issues: issues?.filter((item) => item.status !== 'selesai').length ?? 0,
  };
}

export async function getMvpData() {
  const [assets, summary, utilizations, issues] = await Promise.all([
    getAssets(),
    getDashboardSummary(),
    getUtilizations(),
    getIssues(),
  ]);
  return { assets, summary, utilizations, issues };
}
