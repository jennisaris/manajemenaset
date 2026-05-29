import { NextResponse } from 'next/server';
import { deleteAssetFromDb, upsertAssetToDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import { canManageAssets } from '@/lib/auth';
import type { Asset } from '@/lib/types';

async function requireManager() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageAssets(user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const asset = await request.json() as Asset;
  return NextResponse.json({ asset: await upsertAssetToDb(asset), mode: 'postgres' });
}

export async function DELETE(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Asset id wajib diisi.' }, { status: 400 });
  await deleteAssetFromDb(id);
  return NextResponse.json({ mode: 'postgres' });
}
