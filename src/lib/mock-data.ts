import type { Asset, AssetIssue, DashboardSummary, Utilization } from './types';

export const mockAssets: Asset[] = [];

export const mockSummary: DashboardSummary = {
  total_land: 0,
  total_building: 0,
  total_land_area_m2: 0,
  total_building_area_m2: 0,
  verified_assets: 0,
  pending_verification: 0,
  active_utilizations: 0,
  active_issues: 0,
};

export const mockUtilizations: Utilization[] = [];
export const mockIssues: AssetIssue[] = [];
