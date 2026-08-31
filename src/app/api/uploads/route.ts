import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { validateUploadFile } from '@/lib/server/validation';
import { requireCsrf } from '@/lib/server/csrf-guard';

function safePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/-+/g, '-').replace(/^[-/]+|[-/]+$/g, '') || 'file';
}

export async function POST(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  const folder = safePart(String(form.get('folder') ?? 'general'));
  const desiredPath = safePart(String(form.get('path') ?? ''));
  if (!(file instanceof File)) return NextResponse.json({ error: 'File wajib diisi.' }, { status: 400 });

  const validation = validateUploadFile(file);
  if (!validation.success) {
    const isSizeError = validation.error.toLowerCase().includes('melebihi batas');
    return NextResponse.json({ error: validation.error }, { status: isSizeError ? 413 : 400 });
  }

  const { extension } = validation.data;

  const filename = desiredPath || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safePart(file.name.replace(/\.[^.]+$/, ''))}${extension}`;
  const relativePath = safePart(path.posix.join(folder, filename));
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
  const fullPath = path.join(uploadRoot, relativePath);
  if (!fullPath.startsWith(uploadRoot)) return NextResponse.json({ error: 'Path upload tidak valid.' }, { status: 400 });

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: relativePath, publicUrl: `/uploads/${relativePath}` });
}
