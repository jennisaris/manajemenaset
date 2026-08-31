import 'server-only';
import { directQuery } from '@/lib/server/db';

let migrated = false;

/**
 * Run all schema migrations once at server startup.
 * Safe to call multiple times (idempotent via IF NOT EXISTS).
 */
export async function runMigrations(): Promise<void> {
  if (migrated) return;

  try {
    // Asset columns
    await directQuery('alter table assets add column if not exists status_sertifikasi text');
    await directQuery('alter table assets add column if not exists nilai_perolehan_pertama numeric');
    await directQuery('alter table assets add column if not exists luas_bangunan numeric');
    await directQuery('alter table assets add column if not exists no_psp text');
    await directQuery('alter table assets add column if not exists alamat text');
    await directQuery('alter table assets add column if not exists kode_satker text');
    await directQuery('alter table assets add column if not exists nama_satker text');

    // Profile columns
    await directQuery('alter table profiles add column if not exists nip text');
    await directQuery('alter table profiles add column if not exists satuan_kerja text');
    await directQuery('alter table profiles add column if not exists kode_satker text');
    await directQuery('alter table profiles add column if not exists phone_number text');
    await directQuery('alter table profiles add column if not exists assignment_letter_name text');
    await directQuery('alter table profiles add column if not exists assignment_letter_path text');
    await directQuery('alter table profiles add column if not exists assignment_letter_url text');
    await directQuery('alter table profiles add column if not exists rejection_reason text');
    await directQuery("alter table profiles drop constraint if exists profiles_status_check");
    await directQuery("alter table profiles add constraint profiles_status_check check (status in ('aktif', 'nonaktif', 'menunggu_persetujuan', 'ditolak'))");

    // Rate limits table
    await directQuery(`
      create table if not exists rate_limits (
        key text primary key,
        count integer not null default 1,
        reset_time bigint not null
      )
    `);
    await directQuery(`create index if not exists idx_rate_limits_reset_time on rate_limits (reset_time)`);

    // BMN soft delete columns
    for (const table of ['bmn_alat_angkutan', 'bmn_khusus_tik', 'bmn_non_tik']) {
      await directQuery(`alter table ${table} add column if not exists is_deleted integer not null default 0`);
    }

    migrated = true;
  } catch (err) {
    console.error('[bootstrap] Migration error (will retry):', err);
    // Don't set migrated = true so it retries on next call
  }
}

/**
 * Check if migrations have completed.
 */
export function isMigrated(): boolean {
  return migrated;
}

