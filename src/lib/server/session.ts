import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { requireAuthSecret } from '@/lib/backend-config';
import type { UserRole } from '@/lib/types';

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  university_name: string | null;
  kode_satker?: string | null;
  status: 'aktif' | 'nonaktif';
};

type SessionPayload = SessionUser & { exp: number; nonce: string };

const cookieName = 'aset_session';
const maxAgeSeconds = 60 * 60 * 8;

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string) {
  return createHmac('sha256', requireAuthSecret()).update(data).digest('base64url');
}

export function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: randomBytes(12).toString('base64url'),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function parseSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    id: payload.id,
    email: payload.email,
    full_name: payload.full_name,
    role: payload.role,
    university_name: payload.university_name,
    kode_satker: payload.kode_satker ?? null,
    status: payload.status,
  };
}

export async function getSessionUser() {
  const store = await cookies();
  return parseSessionToken(store.get(cookieName)?.value);
}

export async function setSessionCookie(user: SessionUser) {
  const store = await cookies();
  store.set(cookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(cookieName, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}
