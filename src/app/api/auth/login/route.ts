import { NextResponse } from 'next/server';
import { findUserForLogin } from '@/lib/server/local-repository';
import { verifyPassword } from '@/lib/server/password';
import { setSessionCookie } from '@/lib/server/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };
    if (!email || !password) return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });

    const user = await findUserForLogin(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }
    if (user.status !== 'aktif') return NextResponse.json({ error: 'Akun nonaktif. Hubungi administrator.' }, { status: 403 });

    const sessionUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      university_name: user.university_name,
      status: user.status,
    };
    await setSessionCookie(sessionUser);
    return NextResponse.json({ user: sessionUser });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Login gagal.' }, { status: 500 });
  }
}
