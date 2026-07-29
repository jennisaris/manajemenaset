import 'server-only';
import { getAssetsFromDb } from '@/lib/server/repositories/asset-repository';
import { getUtilizationsFromDb } from '@/lib/server/repositories/utilization-repository';
import { getIssuesFromDb } from '@/lib/server/repositories/issue-repository';
import { mockSummary } from '@/lib/mock-data';
import type { DashboardSummary } from '@/lib/types';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
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
  } catch {
    return mockSummary;
  }
}

export async function getMvpData() {
  try {
    const [assets, utilizations, issues] = await Promise.all([
      getAssetsFromDb().catch(() => []),
      getUtilizationsFromDb().catch(() => []),
      getIssuesFromDb().catch(() => []),
    ]);

    const summary = await getDashboardSummary();

    return {
      assets,
      summary: summary || mockSummary,
      utilizations,
      issues,
    };
  } catch {
    return {
      assets: [],
      summary: mockSummary,
      utilizations: [],
      issues: [],
    };
  }
}
