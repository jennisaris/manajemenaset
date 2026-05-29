import { roles } from './role-utils';
import type { UserRole } from './types';

export { roles };

export const roleDescriptions: Record<UserRole, string> = {
  Superadmin: 'Akses global seluruh kampus, user, role, master data, dan verifikasi akhir.',
  'Admin Aset': 'Admin sekaligus verifikator aset, dibatasi per kampus yang ditugaskan.',
  'Operator Kampus': 'Input dan update data aset kampus sendiri, lalu mengajukan verifikasi.',
  'Pimpinan Dashboard': 'View-only dashboard, peta, dan ringkasan eksekutif tanpa export data.',
};

export function canManageUsers(role: UserRole) {
  return role === 'Superadmin';
}

export function canManageAssets(role: UserRole) {
  return ['Superadmin', 'Admin Aset', 'Operator Kampus'].includes(role);
}

export function canApproveAssets(role: UserRole) {
  return ['Superadmin', 'Admin Aset'].includes(role);
}

export function canVerifyAssets(role: UserRole) {
  return ['Superadmin', 'Admin Aset'].includes(role);
}

export function canViewAllUniversities(role: UserRole) {
  return role === 'Superadmin';
}

export function canViewExecutiveAnalytics(role: UserRole) {
  return ['Superadmin', 'Pimpinan Dashboard'].includes(role);
}

export function canViewReports(role: UserRole) {
  return ['Superadmin', 'Admin Aset'].includes(role);
}

export function canExportReports(role: UserRole) {
  return ['Superadmin', 'Admin Aset'].includes(role);
}
