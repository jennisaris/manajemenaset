import 'server-only';
import { query } from '@/lib/server/db';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { resolveUserRole } from '@/lib/role-utils';
import type { UserProfile, UserRegistrationInput, UserRole, UserStatus } from '@/lib/types';

export type LoginUser = {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  university_name: string | null;
  kode_satker: string | null;
  role: UserRole;
  password_hash: string | null;
  rejection_reason?: string | null;
};

export async function ensureUserProfileColumns() {
  await query('alter table profiles add column if not exists nip text');
  await query('alter table profiles add column if not exists satuan_kerja text');
  await query('alter table profiles add column if not exists kode_satker text');
  await query('alter table profiles add column if not exists phone_number text');
  await query('alter table profiles add column if not exists assignment_letter_name text');
  await query('alter table profiles add column if not exists assignment_letter_path text');
  await query('alter table profiles add column if not exists assignment_letter_url text');
  await query('alter table profiles add column if not exists rejection_reason text');
  await query('alter table profiles drop constraint if exists profiles_status_check');
  await query("alter table profiles add constraint profiles_status_check check (status in ('aktif', 'nonaktif', 'menunggu_persetujuan', 'ditolak'))");
}

export function normalizeUserProfile(row: Record<string, unknown>): UserProfile {
  const statusRaw = String(row.status ?? 'aktif');
  let status: UserStatus = 'aktif';
  if (['nonaktif', 'menunggu_persetujuan', 'ditolak'].includes(statusRaw)) {
    status = statusRaw as UserStatus;
  }

  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    email: row.email ? String(row.email) : null,
    role_name: resolveUserRole(row.role_name),
    campus_name: (row.university_name as string) ?? null,
    university_name: (row.university_name as string) ?? null,
    status,
    nip: (row.nip as string) ?? null,
    satuan_kerja: (row.satuan_kerja as string) ?? null,
    kode_satker: (row.kode_satker as string) ?? null,
    phone_number: (row.phone_number as string) ?? null,
    assignment_letter_name: (row.assignment_letter_name as string) ?? null,
    assignment_letter_path: (row.assignment_letter_path as string) ?? null,
    assignment_letter_url: (row.assignment_letter_url as string) ?? (row.assignment_letter_path ? `/uploads/${row.assignment_letter_path}` : null),
    rejection_reason: (row.rejection_reason as string) ?? null,
    created_at: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
  };
}

export async function findUserForLogin(email: string): Promise<LoginUser | null> {
  await ensureUserProfileColumns();
  const { rows } = await query(`
    select p.id, p.email, p.full_name, p.status, p.university_name, p.kode_satker, p.password_hash, p.rejection_reason, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    where lower(p.email) = lower($1)
    limit 1
  `, [email]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email ?? email),
    full_name: String(row.full_name ?? row.email ?? email),
    status: (row.status as UserStatus) ?? 'aktif',
    university_name: row.university_name as string | null,
    kode_satker: (row.kode_satker as string) ?? null,
    role: resolveUserRole(row.role_name),
    password_hash: row.password_hash as string | null,
    rejection_reason: (row.rejection_reason as string) ?? null,
  };
}

export async function createPendingUserRegistration(input: UserRegistrationInput): Promise<UserProfile> {
  await ensureUserProfileColumns();
  const hashedPassword = hashPassword(input.password);
  
  // Assign default Operator Kampus role_id if available
  const roleRes = await query(`select id from roles where name = 'Operator Kampus' limit 1`);
  const defaultRoleId = roleRes.rows[0]?.id ?? null;

  const { rows } = await query(`
    insert into profiles (full_name, email, password_hash, status, university_name, nip, satuan_kerja, kode_satker, phone_number, assignment_letter_name, assignment_letter_path, assignment_letter_url, role_id)
    values ($1, lower($2), $3, 'menunggu_persetujuan', $4, $5, $6, $7, $8, $9, $10, $11, $12)
    returning *
  `, [
    input.full_name,
    input.email,
    hashedPassword,
    input.satuan_kerja, // Defaults campus/unit to satuan_kerja
    input.nip,
    input.satuan_kerja,
    input.kode_satker ?? null,
    input.phone_number,
    input.assignment_letter_name ?? null,
    input.assignment_letter_path ?? null,
    input.assignment_letter_url ?? (input.assignment_letter_path ? `/uploads/${input.assignment_letter_path}` : null),
    defaultRoleId,
  ]);

  return normalizeUserProfile(rows[0]);
}

export async function getPendingRegistrationsFromDb(): Promise<UserProfile[]> {
  await ensureUserProfileColumns();
  const { rows } = await query(`
    select p.*, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    where p.status = 'menunggu_persetujuan'
    order by p.created_at desc
  `);
  return rows.map((row) => normalizeUserProfile(row));
}

export async function getAllUsersFromDb(): Promise<UserProfile[]> {
  await ensureUserProfileColumns();
  const { rows } = await query(`
    select p.*, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    order by p.created_at desc
  `);
  return rows.map((row) => normalizeUserProfile(row));
}

export async function approveUserRegistration(userId: string, roleName: UserRole, campusName?: string): Promise<UserProfile> {
  await ensureUserProfileColumns();
  const roleRes = await query(`select id from roles where name = $1 limit 1`, [roleName]);
  const roleId = roleRes.rows[0]?.id ?? null;

  const { rows } = await query(`
    update profiles
    set status = 'aktif', role_id = $1, university_name = coalesce($2, university_name), updated_at = now()
    where id = $3
    returning *
  `, [roleId, campusName ?? null, userId]);

  if (!rows[0]) throw new Error('User tidak ditemukan.');
  return normalizeUserProfile(rows[0]);
}

export async function rejectUserRegistration(userId: string, reason?: string): Promise<UserProfile> {
  await ensureUserProfileColumns();
  const { rows } = await query(`
    update profiles
    set status = 'ditolak', rejection_reason = $1, updated_at = now()
    where id = $2
    returning *
  `, [reason ?? 'Pendaftaran ditolak oleh administrator.', userId]);

  if (!rows[0]) throw new Error('User tidak ditemukan.');
  return normalizeUserProfile(rows[0]);
}

export async function updateOwnPassword(userId: string, currentPassword: string, nextPassword: string) {
  const { rows } = await query('select id, password_hash from profiles where id = $1 limit 1', [userId]);
  const row = rows[0];
  if (!row) return { ok: false as const, error: 'User tidak ditemukan.' };
  if (!verifyPassword(currentPassword, row.password_hash as string | null)) {
    return { ok: false as const, error: 'Password saat ini tidak sesuai.' };
  }

  await query('update profiles set password_hash = $1, updated_at = now() where id = $2', [hashPassword(nextPassword), userId]);
  return { ok: true as const };
}
