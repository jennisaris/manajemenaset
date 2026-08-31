-- Local PostgreSQL schema for Sistem Manajemen Aset Universitas.
-- Run with: psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists pgcrypto;

create table if not exists roles (
  id bigserial primary key,
  name text not null unique,
  description text
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif', 'menunggu_persetujuan', 'ditolak')),
  university_name text,
  nip text,
  satuan_kerja text,
  kode_satker text,
  phone_number text,
  assignment_letter_name text,
  assignment_letter_path text,
  assignment_letter_url text,
  rejection_reason text,
  role_id bigint references roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into roles (name, description) values
  ('Superadmin', 'Akses global seluruh kampus, user, role, master data, verifikasi aset, dan persetujuan SK.'),
  ('Operator Kampus', 'Input dan update data aset kampus sendiri, unggah dokumen/foto/GIS, dan usulan penghapusan.'),
  ('Pimpinan Dashboard', 'View-only dashboard, peta sebaran GIS, KPI, dan ringkasan eksekutif.')
on conflict (name) do update set description = excluded.description;

insert into profiles (full_name, email, password_hash, status, university_name, role_id)
select 'Superadmin Tim Pusat', 'superadmin@aset.id', 'plain:superadmin123', 'aktif', null, roles.id from roles where roles.name = 'Superadmin'
on conflict (email) do nothing;

create table if not exists assets (
  id bigserial primary key,
  asset_code text not null unique,
  asset_name text not null,
  asset_type text not null check (asset_type in ('land', 'building')),
  campus_name text,
  faculty_or_unit text,
  address text,
  description text,
  ownership_status text,
  condition_status text,
  verification_status text not null default 'draft' check (verification_status in ('draft','menunggu_verifikasi','revisi','terverifikasi','tidak_aktif')),
  latitude numeric,
  longitude numeric,
  geometry_type text check (geometry_type in ('point','polygon')),
  geometry_geojson jsonb,
  is_deleted smallint not null default 0,
  status_sertifikasi text,
  nilai_perolehan_pertama numeric,
  luas_bangunan numeric,
  no_psp text,
  alamat text,
  kode_satker text,
  nama_satker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists land_assets (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  land_area_m2 numeric default 0
);

create table if not exists building_assets (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  building_area_m2 numeric default 0
);

create table if not exists asset_photos (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  photo_path text not null,
  photo_url text,
  caption text,
  photo_type text default 'lainnya',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(asset_id, photo_path)
);

create table if not exists asset_documents (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  document_name text,
  document_type text default 'lainnya',
  file_path text not null,
  created_at timestamptz not null default now(),
  unique(asset_id, file_path)
);

create table if not exists asset_utilizations (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  third_party_name text not null,
  utilization_type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  utilized_area_m2 numeric,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists asset_issues (
  id bigserial primary key,
  asset_id bigint not null references assets(id) on delete cascade,
  issue_title text not null,
  issue_type text not null,
  description text,
  found_date date,
  priority text not null default 'sedang',
  status text not null default 'dicatat',
  reported_by text,
  resolved_at timestamptz,
  final_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists issue_progress (
  id bigserial primary key,
  issue_id bigint not null references asset_issues(id) on delete cascade,
  progress_date date not null,
  progress_description text not null,
  responsible_person text,
  result_note text,
  status text not null default 'dicatat',
  document_name text,
  document_path text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel Master Satker
create table if not exists satker (
  id bigserial primary key,
  kode_satker text not null unique,
  nama_satker text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel BMN Sub-Menu 2: Alat Angkutan & Kendaraan Bermotor
create table if not exists bmn_alat_angkutan (
  id bigserial primary key,
  jenis_bmn text,
  kode_satker text,
  nama_satker text,
  kode_barang text,
  nup text,
  nama_barang text not null,
  status_bmn text default 'Aktif',
  merk text,
  tipe text,
  kondisi text default 'Baik',
  umur_aset integer default 0,
  intra_extra text default 'Intra',
  henti_guna text default 'Tidak',
  status_sbsn text,
  latitude double precision,
  longitude double precision,
  alamat_lokasi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel BMN Sub-Menu 3: Mesin Khusus TIK
create table if not exists bmn_khusus_tik (
  id bigserial primary key,
  jenis_bmn text,
  kode_satker text,
  nama_satker text,
  kode_barang text,
  nup text,
  nama_barang text not null,
  status_bmn text default 'Aktif',
  merk text,
  tipe text,
  kondisi text default 'Baik',
  umur_aset integer default 0,
  intra_extra text default 'Intra',
  henti_guna text default 'Tidak',
  status_sbsn text,
  latitude double precision,
  longitude double precision,
  alamat_lokasi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel BMN Sub-Menu 4: Mesin Peralatan Non TIK
create table if not exists bmn_non_tik (
  id bigserial primary key,
  jenis_bmn text,
  kode_satker text,
  nama_satker text,
  kode_barang text,
  nup text,
  nama_barang text not null,
  status_bmn text default 'Aktif',
  merk text,
  tipe text,
  kondisi text default 'Baik',
  umur_aset integer default 0,
  intra_extra text default 'Intra',
  henti_guna text default 'Tidak',
  status_sbsn text,
  latitude double precision,
  longitude double precision,
  alamat_lokasi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabel Usulan Penghapusan BMN
create table if not exists bmn_disposals (
  id bigserial primary key,
  kode_satker text not null,
  nama_satker text not null,
  no_surat_permohonan text not null,
  tgl_surat_permohonan date,
  surat_permohonan_name text,
  surat_permohonan_path text,
  surat_permohonan_url text,
  sptjm_name text,
  sptjm_path text,
  sptjm_url text,
  lampiran_name text,
  lampiran_path text,
  lampiran_url text,
  sk_tim_name text,
  sk_tim_path text,
  sk_tim_url text,
  ba_penelitian_name text,
  ba_penelitian_path text,
  ba_penelitian_url text,
  jumlah_barang integer default 0,
  jenis_barang text,
  nilai_perolehan numeric default 0,
  status text not null default 'menunggu_verifikasi',
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indeks Performa Database
create index if not exists idx_assets_is_deleted_verification on assets(is_deleted, verification_status);
create index if not exists idx_assets_kode_satker on assets(kode_satker);
create index if not exists idx_assets_campus_name on assets(campus_name);
create index if not exists idx_assets_type on assets(asset_type);
create index if not exists idx_asset_photos_asset_id on asset_photos(asset_id);
create index if not exists idx_asset_documents_asset_id on asset_documents(asset_id);
create index if not exists idx_asset_utilizations_asset_id_status on asset_utilizations(asset_id, status);
create index if not exists idx_asset_issues_asset_id_status on asset_issues(asset_id, status);
create index if not exists idx_issue_progress_issue_id on issue_progress(issue_id);
create index if not exists idx_bmn_alat_angkutan_satker on bmn_alat_angkutan(kode_satker);
create index if not exists idx_bmn_khusus_tik_satker on bmn_khusus_tik(kode_satker);
create index if not exists idx_bmn_non_tik_satker on bmn_non_tik(kode_satker);
create index if not exists idx_bmn_disposals_satker on bmn_disposals(kode_satker);
create index if not exists idx_bmn_disposals_status on bmn_disposals(status);
create index if not exists idx_profiles_status on profiles(status);
create index if not exists idx_profiles_nip on profiles(nip);
create index if not exists idx_profiles_kode_satker on profiles(kode_satker);
create index if not exists idx_satker_kode on satker(kode_satker);
