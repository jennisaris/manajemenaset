import { NextResponse } from 'next/server';
import { updateOwnPassword } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, nextPassword, confirmPassword } = await request.json() as {
      currentPassword?: string;
      nextPassword?: string;
      confirmPassword?: string;
    };

    if (!currentPassword || !nextPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Password saat ini, password baru, dan konfirmasi wajib diisi.' }, { status: 400 });
    }
    if (nextPassword.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }
    if (nextPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Konfirmasi password tidak sama.' }, { status: 400 });
    }
    if (currentPassword === nextPassword) {
      return NextResponse.json({ error: 'Password baru harus berbeda dari password saat ini.' }, { status: 400 });
    }

    const result = await updateOwnPassword(user.id, currentPassword, nextPassword);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal mengubah password.' }, { status: 500 });
  }
}
