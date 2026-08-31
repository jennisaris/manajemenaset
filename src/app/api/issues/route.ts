import { NextResponse } from 'next/server';
import { deleteIssueFromDb, upsertIssueToDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import { canManageAssets } from '@/lib/auth';
import { requireCsrf } from '@/lib/server/csrf-guard';
import type { AssetIssue } from '@/lib/types';

async function requireManager() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageAssets(user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function POST(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const auth = await requireManager();
  if (auth.error) return auth.error;
  const { issue, isNew } = await request.json() as { issue: AssetIssue; isNew?: boolean };
  return NextResponse.json({ issue: await upsertIssueToDb(issue, isNew), mode: 'postgres' });
}

export async function DELETE(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const auth = await requireManager();
  if (auth.error) return auth.error;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Issue id wajib diisi.' }, { status: 400 });
  await deleteIssueFromDb(id);
  return NextResponse.json({ mode: 'postgres' });
}
