import { NextResponse } from 'next/server';
import { getIssueProgressFromDb, upsertIssueProgressToDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import { canManageAssets } from '@/lib/auth';
import type { IssueProgress } from '@/lib/types';

async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user };
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  return NextResponse.json({ progress: await getIssueProgressFromDb(), mode: 'postgres' });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (!canManageAssets(auth.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const progress = await request.json() as IssueProgress;
  return NextResponse.json({ progress: await upsertIssueProgressToDb(progress), mode: 'postgres' });
}
