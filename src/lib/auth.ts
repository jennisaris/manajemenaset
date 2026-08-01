import { roles } from './role-utils';
import type { UserRole } from './types';

export { roles };

export const roleDescriptions: Record<UserRole, string> = {
  Superadmin: 'Akses penuh seluruh Satker, verifikasi aset, penetapan SK penghapusan BMN, & approval user.',
  'Operator Kampus': 'Input & unggah massal data aset Satker, ajukan usulan penghapusan BMN.',
  'Pimpinan Dashboard': 'Akses monitoring eksekutif, peta GIS, statistik portofolio, dan laporan.',
};

export function canManageUsers(role: UserRole) {
  return role === 'Superadmin';
}

export function canManageAssets(role: UserRole) {
  return ['Superadmin', 'Operator Kampus'].includes(role);
}

export function canApproveAssets(role: UserRole) {
  return role === 'Superadmin';
}

export function canVerifyAssets(role: UserRole) {
  return role === 'Superadmin';
}

export function canViewAllUniversities(role: UserRole) {
  return ['Superadmin', 'Pimpinan Dashboard'].includes(role);
}

export function canViewExecutiveAnalytics(role: UserRole) {
  return ['Superadmin', 'Pimpinan Dashboard'].includes(role);
}

export function canViewReports(role: UserRole) {
  return ['Superadmin', 'Pimpinan Dashboard'].includes(role);
}

export function canExportReports(role: UserRole) {
  return ['Superadmin', 'Pimpinan Dashboard'].includes(role);
}
