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
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  university_name text,
  role_id bigint references roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

insert into roles (name, description) values
  ('Superadmin', 'Akses global seluruh kampus, user, role, master data, dan verifikasi akhir.'),
  ('Admin Aset', 'Admin sekaligus verifikator aset, dibatasi per kampus yang ditugaskan.'),
  ('Operator Kampus', 'Input dan update data aset kampus sendiri, lalu mengajukan verifikasi.'),
  ('Pimpinan Dashboard', 'View-only dashboard, peta, dan ringkasan eksekutif tanpa export data.')
on conflict (name) do update set description = excluded.description;

-- Password demo memakai format plain: untuk bootstrap. Ganti dengan hash via scripts/hash-password.mjs sebelum produksi.
insert into profiles (full_name, email, password_hash, status, university_name, role_id)
select 'Admin Aset', 'admin@aset.id', 'plain:admin123', 'aktif', 'Kampus Utama', roles.id from roles where roles.name = 'Admin Aset'
on conflict (email) do nothing;

insert into profiles (full_name, email, password_hash, status, university_name, role_id)
select 'Operator Aset', 'operator@aset.id', 'plain:operator123', 'aktif', 'Kampus Utama', roles.id from roles where roles.name = 'Operator Kampus'
on conflict (email) do nothing;
