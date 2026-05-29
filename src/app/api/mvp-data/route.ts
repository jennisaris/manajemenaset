import { NextResponse } from 'next/server';
import { getMvpDataFromDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await getMvpDataFromDb();
  return NextResponse.json(data);
}
