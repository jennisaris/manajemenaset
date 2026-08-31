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

export function normalizeUserProfile(row: Record<string, unknown>): UserProfile {
  const statusRaw = String(row.status ?? 'aktif');
  let status: UserStatus = 'aktif';
  if (['nonaktif', 'menunggu_persetujuan', 'ditolak'].includes(statusRaw)) {
    status = statusRaw as UserStatus;
  }

  let roleName: UserRole = 'Operator Kampus';
  if (row.role_name) {
    try {
      roleName = resolveUserRole(row.role_name);
    } catch {
      roleName = 'Operator Kampus';
    }
  }

  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    email: row.email ? String(row.email) : null,
    role_name: roleName,
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

export async function findUserByNip(nip: string): Promise<LoginUser | null> {
  const { rows } = await query(`
    select p.id, p.email, p.full_name, p.status, p.university_name, p.kode_satker, p.password_hash, p.rejection_reason, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    where p.nip = $1
    limit 1
  `, [nip.trim()]);
  const row = rows[0];
  if (!row) return null;

  let resolvedRole: UserRole = 'Operator Kampus';
  if (row.role_name) {
    try {
      resolvedRole = resolveUserRole(row.role_name);
    } catch {
      resolvedRole = 'Operator Kampus';
    }
  }

  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    full_name: String(row.full_name ?? ''),
    status: (row.status as UserStatus) ?? 'aktif',
    university_name: row.university_name as string | null,
    kode_satker: (row.kode_satker as string) ?? null,
    role: resolvedRole,
    password_hash: row.password_hash as string | null,
    rejection_reason: (row.rejection_reason as string) ?? null,
  };
}

export async function findUserForLogin(email: string): Promise<LoginUser | null> {

  const cleanEmail = email.trim().toLowerCase();

  const { rows } = await query(`
    select p.id, p.email, p.full_name, p.status, p.university_name, p.kode_satker, p.password_hash, p.rejection_reason, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    where lower(p.email) = lower($1)
    limit 1
  `, [cleanEmail]);

  const row = rows[0];
  if (!row) return null;

  let resolvedRole: UserRole = 'Operator Kampus';
  if (row.role_name) {
    try {
      resolvedRole = resolveUserRole(row.role_name);
    } catch {
      resolvedRole = 'Operator Kampus';
    }
  }

  return {
    id: String(row.id),
    email: String(row.email ?? cleanEmail),
    full_name: String(row.full_name ?? row.email ?? cleanEmail),
    status: (row.status as UserStatus) ?? 'aktif',
    university_name: row.university_name as string | null,
    kode_satker: (row.kode_satker as string) ?? null,
    role: resolvedRole,
    password_hash: row.password_hash as string | null,
    rejection_reason: (row.rejection_reason as string) ?? null,
  };
}

export async function createPendingUserRegistration(input: UserRegistrationInput): Promise<UserProfile> {

  const hashedPassword = hashPassword(input.password);
  
  // Assign default Operator role_id if available
  const roleRes = await query(`select id from roles where name in ('Operator Kampus', 'Operator') order by case when name = 'Operator Kampus' then 1 else 2 end limit 1`);
  const defaultRoleId = roleRes.rows[0]?.id ?? '3';

  // Check if existing profile with this email exists (e.g. previously rejected or draft)
  const existingRes = await query(`select id from profiles where lower(email) = lower($1)`, [input.email]);
  if (existingRes.rows.length > 0) {
    const existingId = existingRes.rows[0].id;
    const { rows } = await query(`
      update profiles
      set full_name = $1,
          password_hash = $2,
          status = 'menunggu_persetujuan',
          university_name = $3,
          nip = $4,
          satuan_kerja = $5,
          kode_satker = $6,
          phone_number = $7,
          assignment_letter_name = coalesce($8, assignment_letter_name),
          assignment_letter_path = coalesce($9, assignment_letter_path),
          assignment_letter_url = coalesce($10, assignment_letter_url),
          role_id = coalesce(role_id, $11),
          rejection_reason = null,
          updated_at = now()
      where id = $12
      returning *
    `, [
      input.full_name,
      hashedPassword,
      input.satuan_kerja,
      input.nip,
      input.satuan_kerja,
      input.kode_satker ?? null,
      input.phone_number,
      input.assignment_letter_name ?? null,
      input.assignment_letter_path ?? null,
      input.assignment_letter_url ?? (input.assignment_letter_path ? `/uploads/${input.assignment_letter_path}` : null),
      defaultRoleId,
      existingId,
    ]);

    const roleFetch = await query(`select p.*, r.name as role_name from profiles p left join roles r on r.id = p.role_id where p.id = $1`, [rows[0].id]);
    return normalizeUserProfile(roleFetch.rows[0] ?? rows[0]);
  }

  const { rows } = await query(`
    insert into profiles (full_name, email, password_hash, status, university_name, nip, satuan_kerja, kode_satker, phone_number, assignment_letter_name, assignment_letter_path, assignment_letter_url, role_id)
    values ($1, lower($2), $3, 'menunggu_persetujuan', $4, $5, $6, $7, $8, $9, $10, $11, $12)
    returning *
  `, [
    input.full_name,
    input.email,
    hashedPassword,
    input.satuan_kerja,
    input.nip,
    input.satuan_kerja,
    input.kode_satker ?? null,
    input.phone_number,
    input.assignment_letter_name ?? null,
    input.assignment_letter_path ?? null,
    input.assignment_letter_url ?? (input.assignment_letter_path ? `/uploads/${input.assignment_letter_path}` : null),
    defaultRoleId,
  ]);

  const roleFetch = await query(`select p.*, r.name as role_name from profiles p left join roles r on r.id = p.role_id where p.id = $1`, [rows[0].id]);
  return normalizeUserProfile(roleFetch.rows[0] ?? rows[0]);
}

export async function getPendingRegistrationsFromDb(): Promise<UserProfile[]> {

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

  const { rows } = await query(`
    select p.*, r.name as role_name
    from profiles p
    left join roles r on r.id = p.role_id
    order by p.created_at desc
  `);
  return rows.map((row) => normalizeUserProfile(row));
}

export async function approveUserRegistration(userId: string, roleName: UserRole, campusName?: string): Promise<UserProfile> {

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
