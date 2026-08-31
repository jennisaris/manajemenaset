import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { canManageUsers } from '@/lib/auth';
import { fetchPendingUsers, fetchAllUsers, approveUser, rejectUser } from '@/lib/server/services/user-service';
import { requireCsrf } from '@/lib/server/csrf-guard';
import type { UserRole } from '@/lib/types';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageUsers(user.role)) return { error: NextResponse.json({ error: 'Forbidden. Membutuhkan role Administrator.' }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  if (statusFilter === 'pending') {
    const pendingUsers = await fetchPendingUsers();
    return NextResponse.json({ users: pendingUsers });
  }

  const allUsers = await fetchAllUsers();
  return NextResponse.json({ users: allUsers });
}

export async function POST(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as {
      userId?: string;
      action?: 'approve' | 'reject';
      role_name?: UserRole;
      campus_name?: string;
      rejection_reason?: string;
    };

    if (!body.userId || !body.action) {
      return NextResponse.json({ error: 'userId dan action wajib diisi.' }, { status: 400 });
    }

    if (body.action === 'approve') {
      const roleName = body.role_name ?? 'Operator Kampus';
      const updatedUser = await approveUser(body.userId, roleName, body.campus_name);
      return NextResponse.json({ message: `User ${updatedUser.full_name} berhasil disetujui.`, user: updatedUser });
    } else {
      const updatedUser = await rejectUser(body.userId, body.rejection_reason);
      return NextResponse.json({ message: `Pendaftaran ${updatedUser.full_name} berhasil ditolak.`, user: updatedUser });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses persetujuan.' }, { status: 500 });
  }
}
