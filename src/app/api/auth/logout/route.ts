import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/server/session';
import { requireCsrf } from '@/lib/server/csrf-guard';

export async function POST() {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
