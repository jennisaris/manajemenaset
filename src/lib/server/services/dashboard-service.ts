import 'server-only';
import { query } from '@/lib/server/db';
import { getAssetCountFromDb, getAssetsFromDb } from '@/lib/server/repositories/asset-repository';
import { getUtilizationsFromDb } from '@/lib/server/repositories/utilization-repository';
import { getIssuesFromDb } from '@/lib/server/repositories/issue-repository';
import { mockSummary } from '@/lib/mock-data';
import type { DashboardSummary } from '@/lib/types';

export type MvpDataOptions = { assetLimit?: number; assetOffset?: number };

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const [{ rows: assetRows }, utilizations, issues] = await Promise.all([
      query(`
        select
          count(*) filter (where asset_type = 'land')::bigint as total_land,
          count(*) filter (where asset_type = 'building')::bigint as total_building,
          count(*) filter (where verification_status = 'terverifikasi')::bigint as verified_assets,
          count(*) filter (where verification_status = 'menunggu_verifikasi')::bigint as pending_verification
        from assets
        where coalesce(is_deleted, 0) = 0
      `),
      getUtilizationsFromDb(),
      getIssuesFromDb(),
    ]);
    const assetStats = assetRows[0] ?? {};
    return {
      total_land: Number(assetStats.total_land ?? 0),
      total_building: Number(assetStats.total_building ?? 0),
      total_land_area_m2: 0,
      total_building_area_m2: 0,
      verified_assets: Number(assetStats.verified_assets ?? 0),
      pending_verification: Number(assetStats.pending_verification ?? 0),
      active_utilizations: utilizations.filter((item) => ['aktif', 'akan_berakhir'].includes(item.status)).length,
      active_issues: issues.filter((issue) => issue.status !== 'selesai').length,
    };
  } catch {
    return mockSummary;
  }
}

export async function getMvpData(options: MvpDataOptions = {}) {
  const assetLimit = options.assetLimit && options.assetLimit > 0 ? options.assetLimit : 100000;
  const assetOffset = Math.max(0, options.assetOffset ?? 0);
  try {
    const [assets, totalAssets, utilizations, issues, summary] = await Promise.all([
      getAssetsFromDb({ limit: assetLimit, offset: assetOffset }).catch(() => []),
      getAssetCountFromDb().catch(() => 0),
      getUtilizationsFromDb().catch(() => []),
      getIssuesFromDb().catch(() => []),
      getDashboardSummary(),
    ]);

    return {
      assets,
      summary: summary || mockSummary,
      utilizations,
      issues,
      pagination: {
        assets: {
          limit: assetLimit,
          offset: assetOffset,
          total: totalAssets,
          returned: assets.length,
          hasMore: assetOffset + assets.length < totalAssets,
        },
      },
    };
  } catch {
    return {
      assets: [],
      summary: mockSummary,
      utilizations: [],
      issues: [],
      pagination: { assets: { limit: assetLimit, offset: assetOffset, total: 0, returned: 0, hasMore: false } },
    };
  }
}
