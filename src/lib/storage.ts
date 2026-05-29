const assetPhotoFolder = 'asset-photos';
const assetDocumentFolder = 'asset-documents';

function safeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset-photo';
}

function uniqueSuffix() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
}

function filenameStem(value: string) {
  return safeFilename(value.replace(/\.[^.]+$/, ''));
}

async function uploadLocalFile({ folder, path, file }: { folder: string; path: string; file: File }) {
  const form = new FormData();
  form.append('folder', folder);
  form.append('path', path);
  form.append('file', file);
  const response = await fetch('/api/uploads', { method: 'POST', body: form, credentials: 'same-origin' });
  const payload = await response.json().catch(() => null) as { path?: string; publicUrl?: string; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Upload gagal (${response.status})`);
  if (!payload?.path) throw new Error('Upload gagal: path file kosong.');
  return { path: payload.path, publicUrl: payload.publicUrl ?? `/uploads/${payload.path}` };
}

export async function uploadAssetPhoto({ assetId, assetCode, file }: { assetId: number; assetCode: string; file: File }) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${assetId}/${uniqueSuffix()}-${safeFilename(assetCode)}-${filenameStem(file.name)}.${extension}`;
  return uploadLocalFile({ folder: assetPhotoFolder, path, file });
}

export function createAssetPhotoPreviewUrl(path: string) {
  if (!path) return null;
  return path.startsWith('/uploads/') || path.startsWith('http') ? path : `/uploads/${path}`;
}

export async function uploadAssetDocument({ assetId, assetCode, file }: { assetId: number; assetCode: string; file: File }) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const path = `${assetId}/${uniqueSuffix()}-${safeFilename(assetCode)}-${filenameStem(file.name)}.${extension}`;
  const uploaded = await uploadLocalFile({ folder: assetDocumentFolder, path, file });
  return { path: uploaded.path };
}

export async function uploadUtilizationPks({ utilizationId, assetId, file }: { utilizationId: number; assetId: number; file: File }) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Dokumen PKS wajib berformat PDF.');
  }
  const path = `${assetId}/pks/${utilizationId}/${uniqueSuffix()}-${filenameStem(file.name)}.pdf`;
  const uploaded = await uploadLocalFile({ folder: assetDocumentFolder, path, file });
  return { path: uploaded.path };
}

export async function uploadUtilizationPhoto({ utilizationId, assetId, file }: { utilizationId: number; assetId: number; file: File }) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Foto pemanfaatan wajib berformat gambar.');
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${assetId}/utilizations/${utilizationId}/${uniqueSuffix()}-${filenameStem(file.name)}.${extension}`;
  return uploadLocalFile({ folder: assetPhotoFolder, path, file });
}

export async function uploadIssueProgressDocument({ issueId, file }: { issueId: number; file: File }) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `issues/${issueId}/progress/${uniqueSuffix()}-${filenameStem(file.name)}.${extension}`;
  const uploaded = await uploadLocalFile({ folder: assetDocumentFolder, path, file });
  return { path: uploaded.path };
}

export async function createAssetDocumentPreviewUrl(path: string) {
  if (!path) return null;
  return path.startsWith('/uploads/') || path.startsWith('http') ? path : `/uploads/${path}`;
}

export async function createAssetDocumentPreviewUrls(paths: string[]) {
  return paths.map((path) => path.startsWith('/uploads/') || path.startsWith('http') ? path : `/uploads/${path}`);
}
