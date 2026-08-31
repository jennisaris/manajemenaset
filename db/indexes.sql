-- High Performance Database Indexes for Sistem Manajemen Aset Universitas
-- Apply with: psql "$DATABASE_URL" -f db/indexes.sql

-- Assets indexing for soft delete, verification filtering, and satker scope
create index if not exists idx_assets_is_deleted_verification on assets(is_deleted, verification_status);
create index if not exists idx_assets_kode_satker on assets(kode_satker);
create index if not exists idx_assets_campus_name on assets(campus_name);
create index if not exists idx_assets_type on assets(asset_type);

-- FK indexes for one-to-many asset media & document relations
create index if not exists idx_asset_photos_asset_id on asset_photos(asset_id);
create index if not exists idx_asset_documents_asset_id on asset_documents(asset_id);

-- Composite indexes for active utilizations & active issues queries
create index if not exists idx_asset_utilizations_asset_id_status on asset_utilizations(asset_id, status);
create index if not exists idx_asset_issues_asset_id_status on asset_issues(asset_id, status);
create index if not exists idx_issue_progress_issue_id on issue_progress(issue_id);

-- BMN module indexes for satker scoping & disposal status
create index if not exists idx_bmn_alat_angkutan_satker on bmn_alat_angkutan(kode_satker);
create index if not exists idx_bmn_khusus_tik_satker on bmn_khusus_tik(kode_satker);
create index if not exists idx_bmn_non_tik_satker on bmn_non_tik(kode_satker);
create index if not exists idx_bmn_disposals_satker on bmn_disposals(kode_satker);
create index if not exists idx_bmn_disposals_status on bmn_disposals(status);

-- User profiles status and satker indexing
create index if not exists idx_profiles_status on profiles(status);
create index if not exists idx_profiles_nip on profiles(nip);
create index if not exists idx_profiles_kode_satker on profiles(kode_satker);

-- Master Satker lookup
create index if not exists idx_satker_kode on satker(kode_satker);
