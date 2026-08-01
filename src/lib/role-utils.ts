import type { UserRole } from './types';

export const roles: UserRole[] = ['Superadmin', 'Operator Kampus', 'Pimpinan Dashboard'];

const legacyRoleMap: Record<string, UserRole> = {
  'Super Admin': 'Superadmin',
  'Admin Aset': 'Superadmin',
  Admin: 'Superadmin',
  'Admin Kampus': 'Superadmin',
  Verifikator: 'Superadmin',
  Operator: 'Operator Kampus',
  'Operator Aset': 'Operator Kampus',
  Executive: 'Pimpinan Dashboard',
  Pimpinan: 'Pimpinan Dashboard',
  'Pimpinan/Viewer': 'Pimpinan Dashboard',
  Viewer: 'Pimpinan Dashboard',
};

export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if ((roles as string[]).includes(trimmed)) return trimmed as UserRole;
  return legacyRoleMap[trimmed] ?? null;
}

export function resolveUserRole(value: unknown): UserRole {
  const role = normalizeUserRole(value);
  if (!role) throw new Error(`Role tidak valid: ${String(value || '-')}`);
  return role;
}
