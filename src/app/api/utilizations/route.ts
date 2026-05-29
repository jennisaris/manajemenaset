import { NextResponse } from 'next/server';
import { deleteUtilizationFromDb, upsertUtilizationToDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import { canManageAssets } from '@/lib/auth';
import type { Utilization } from '@/lib/types';

async function requireManager() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageAssets(user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const { utilization, isNew } = await request.json() as { utilization: Utilization; isNew?: boolean };
  return NextResponse.json({ utilization: await upsertUtilizationToDb(utilization, isNew), mode: 'postgres' });
}

export async function DELETE(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Utilization id wajib diisi.' }, { status: 400 });
  await deleteUtilizationFromDb(id);
  return NextResponse.json({ mode: 'postgres' });
}
