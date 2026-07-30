import { NextResponse } from 'next/server';
import { getMvpDataFromDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import type { Asset, AssetIssue, DashboardSummary, Utilization } from '@/lib/types';

type MvpData = { assets: Asset[]; summary: DashboardSummary; utilizations: Utilization[]; issues: AssetIssue[] };

function buildSummary(assets: Asset[], utilizations: Utilization[], issues: AssetIssue[]): DashboardSummary {
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

function scopeDataForOperator(
  data: MvpData,
  kodeSatker?: string | null,
  universityName?: string | null
): MvpData {
  if (!kodeSatker && !universityName) return data;

  const assets = data.assets.filter((asset) => {
    if (kodeSatker && asset.kode_satker === kodeSatker) return true;
    if (universityName && (asset.campus_name === universityName || asset.nama_satker === universityName)) return true;
    if (kodeSatker && asset.asset_code && asset.asset_code.includes(kodeSatker)) return true;
    return false;
  });

  const finalAssets = assets.length > 0 ? assets : data.assets;
  const assetIds = new Set(finalAssets.map((asset) => asset.id));
  const utilizations = data.utilizations.filter((item) => assetIds.has(item.asset_id));
  const issues = data.issues.filter((issue) => assetIds.has(issue.asset_id));
  return { assets: finalAssets, utilizations, issues, summary: buildSummary(finalAssets, utilizations, issues) };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await getMvpDataFromDb();
    if (user.role === 'Operator Kampus') {
      return NextResponse.json(scopeDataForOperator(data, user.kode_satker, user.university_name));
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error fetching data' }, { status: 500 });
  }
}
