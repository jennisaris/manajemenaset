import 'server-only';
import type { Asset, AssetIssue, Utilization } from '@/lib/types';

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// File size limits in bytes
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_DEFAULT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.xlsx', '.xls', '.csv']);

/**
 * Validates uploaded file size and extension
 */
export function validateUploadFile(file: File): ValidationResult<{ size: number; extension: string }> {
  if (!file || typeof file.size !== 'number') {
    return { success: false, error: 'File tidak valid atau kosong.' };
  }

  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
  const allowedExtensions = [...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS];

  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      success: false,
      error: 'Format berkas tidak diizinkan. Hanya file PDF, Gambar (PNG/JPG), dan Excel/CSV yang diperbolehkan.',
    };
  }

  if (IMAGE_EXTENSIONS.has(extension) && file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: `Ukuran gambar melebihi batas maksimum ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  if (DOCUMENT_EXTENSIONS.has(extension) && file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      success: false,
      error: `Ukuran dokumen melebihi batas maksimum ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  if (file.size > MAX_DEFAULT_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `Ukuran berkas melebihi batas maksimum ${MAX_DEFAULT_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  return { success: true, data: { size: file.size, extension } };
}

/**
 * Validates login payload
 */
export function validateLoginPayload(body: unknown): ValidationResult<{ email: string; password: string }> {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Payload request tidak valid.' };
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
    return { success: false, error: 'Format email tidak valid.', field: 'email' };
  }

  if (typeof password !== 'string' || password.length === 0) {
    return { success: false, error: 'Password wajib diisi.', field: 'password' };
  }

  return { success: true, data: { email: email.trim().toLowerCase(), password } };
}

/**
 * Validates asset upsert payload
 */
export function validateAssetPayload(body: unknown): ValidationResult<Asset> {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Payload aset tidak valid.' };
  }

  const asset = body as Partial<Asset>;

  if (typeof asset.asset_code !== 'string' || !asset.asset_code.trim()) {
    return { success: false, error: 'Kode aset (asset_code) wajib diisi.', field: 'asset_code' };
  }

  if (typeof asset.asset_name !== 'string' || !asset.asset_name.trim()) {
    return { success: false, error: 'Nama aset (asset_name) wajib diisi.', field: 'asset_name' };
  }

  if (asset.asset_type !== 'land' && asset.asset_type !== 'building') {
    return { success: false, error: 'Tipe aset harus berupa "land" atau "building".', field: 'asset_type' };
  }

  if (asset.latitude !== undefined && asset.latitude !== null) {
    const lat = Number(asset.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { success: false, error: 'Latitude harus bernilai antara -90 dan 90.', field: 'latitude' };
    }
  }

  if (asset.longitude !== undefined && asset.longitude !== null) {
    const lng = Number(asset.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { success: false, error: 'Longitude harus bernilai antara -180 dan 180.', field: 'longitude' };
    }
  }

  const validStatuses: Asset['verification_status'][] = [
    'draft',
    'menunggu_verifikasi',
    'revisi',
    'terverifikasi',
    'tidak_aktif',
  ];

  if (asset.verification_status && !validStatuses.includes(asset.verification_status)) {
    return { success: false, error: 'Status verifikasi tidak valid.', field: 'verification_status' };
  }

  return { success: true, data: asset as Asset };
}
