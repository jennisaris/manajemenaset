export type AssetType = 'land' | 'building';
export type VerificationStatus = 'draft' | 'menunggu_verifikasi' | 'revisi' | 'terverifikasi' | 'tidak_aktif';
export type UserRole = 'Superadmin' | 'Admin Aset' | 'Operator Kampus' | 'Pimpinan Dashboard';

export type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role_name: UserRole;
  campus_name: string | null;
  status: 'aktif' | 'nonaktif';
  university_name: string | null;
};

export type Asset = {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: AssetType;
  campus_name: string | null;
  faculty_or_unit: string | null;
  address: string | null;
  ownership_status: string | null;
  condition_status: string | null;
  verification_status: VerificationStatus;
  latitude: number | null;
  longitude: number | null;
  geometry_type: 'point' | 'polygon' | null;
  geometry_geojson: GeoJSON.Geometry | null;
  primary_photo_url?: string | null;
  primary_photo_path?: string | null;
  photo_paths?: string[];
  photo_urls?: string[];
  photo_names?: string[];
  document_paths?: string[];
  document_names?: string[];
  document_urls?: string[];
  has_active_issue?: boolean;
  has_active_utilization?: boolean;
};

export type DashboardSummary = {
  total_land: number;
  total_building: number;
  total_land_area_m2: number;
  total_building_area_m2: number;
  verified_assets: number;
  pending_verification: number;
  active_utilizations: number;
  active_issues: number;
};

export type Utilization = {
  id: number;
  asset_id: number;
  third_party_name: string;
  utilization_type: string;
  start_date: string;
  end_date: string;
  status: string;
  utilized_area_m2?: number | null;
  geometry_geojson?: GeoJSON.Geometry | null;
  use_full_asset_area?: boolean;
  pks_document_name?: string | null;
  pks_document_path?: string | null;
  pks_document_url?: string | null;
  photo_names?: string[];
  photo_paths?: string[];
  photo_urls?: string[];
};

export type AssetIssue = {
  id: number;
  asset_id: number;
  issue_title: string;
  issue_type: string;
  priority: string;
  status: string;
  found_date: string | null;
};

export type IssueProgress = {
  id: number;
  issue_id: number;
  progress_date: string;
  progress_description: string;
  responsible_person: string | null;
  result_note: string | null;
  status: string;
  document_name?: string | null;
  document_path?: string | null;
  document_url?: string | null;
};
