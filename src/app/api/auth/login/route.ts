import { NextResponse } from 'next/server';
import { findUserForLogin } from '@/lib/server/local-repository';
import { verifyPassword } from '@/lib/server/password';
import { setSessionCookie } from '@/lib/server/session';
import { checkRateLimit, resetRateLimit } from '@/lib/server/rate-limiter';
import { validateLoginPayload } from '@/lib/server/validation';
import { logger } from '@/lib/server/logger';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Global IP rate check (max 20 login attempts per minute per IP)
    const ipLimit = await checkRateLimit(`login:ip:${clientIp}`, 20, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan login dari IP ini. Silakan tunggu ${ipLimit.resetSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(ipLimit.resetSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const validation = validateLoginPayload(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password } = validation.data;
    const accountRateKey = `login:account:${clientIp}:${email}`;

    // Account-specific rate check (max 5 failed attempts per minute)
    const accountLimit = await checkRateLimit(accountRateKey, 5, 60 * 1000);
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login gagal untuk akun ini. Silakan coba lagi dalam ${accountLimit.resetSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(accountLimit.resetSeconds) } }
      );
    }

    const user = await findUserForLogin(email);
    const isValid = user ? verifyPassword(password, user.password_hash) : false;

    if (!user || !isValid) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    if (user.status === 'menunggu_persetujuan') {
      return NextResponse.json({ error: 'Pendaftaran akun Anda sedang dalam proses persetujuan (Pending Approval) oleh Administrator.' }, { status: 403 });
    }
    if (user.status === 'ditolak') {
      return NextResponse.json({ error: `Pendaftaran akun Anda ditolak. Catatan: "${user.rejection_reason || 'Dokumen belum sesuai.'}"` }, { status: 403 });
    }
    if (user.status !== 'aktif') {
      return NextResponse.json({ error: 'Akun nonaktif. Hubungi administrator.' }, { status: 403 });
    }

    // Reset rate limit on successful authentication
    await resetRateLimit(accountRateKey);

    const sessionUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      university_name: user.university_name,
      kode_satker: user.kode_satker,
      status: user.status,
    };
    await setSessionCookie(sessionUser);
    return NextResponse.json({ user: sessionUser });
  } catch (error) {
    logger.error('Login failed', 'auth', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Login gagal.' }, { status: 500 });
  }
}
