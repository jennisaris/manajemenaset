import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { canManageUsers } from '@/lib/auth';
import {
  fetchPendingUsers,
  fetchAllUsers,
  approveUser,
  rejectUser,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from '@/lib/server/services/user-service';
import { requireCsrf } from '@/lib/server/csrf-guard';
import type { UserRole, UserStatus } from '@/lib/types';

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
      id?: string;
      action?: 'approve' | 'reject' | 'create';
      full_name?: string;
      email?: string;
      password?: string;
      role_name?: UserRole;
      campus_name?: string;
      status?: UserStatus;
      rejection_reason?: string;
    };

    if (body.action === 'approve') {
      const targetId = body.userId || body.id;
      if (!targetId) return NextResponse.json({ error: 'userId wajib diisi untuk approve.' }, { status: 400 });
      const roleName = body.role_name ?? 'Operator Kampus';
      const updatedUser = await approveUser(targetId, roleName, body.campus_name);
      return NextResponse.json({ message: `User ${updatedUser.full_name} berhasil disetujui.`, user: updatedUser });
    }

    if (body.action === 'reject') {
      const targetId = body.userId || body.id;
      if (!targetId) return NextResponse.json({ error: 'userId wajib diisi untuk reject.' }, { status: 400 });
      const updatedUser = await rejectUser(targetId, body.rejection_reason);
      return NextResponse.json({ message: `Pendaftaran ${updatedUser.full_name} berhasil ditolak.`, user: updatedUser });
    }

    // Direct create user
    if (!body.full_name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: 'Nama lengkap dan email wajib diisi.' }, { status: 400 });
    }

    const newUser = await adminCreateUser({
      full_name: body.full_name.trim(),
      email: body.email.trim(),
      password: body.password,
      role_name: body.role_name ?? 'Operator Kampus',
      campus_name: body.campus_name ?? null,
      status: body.status ?? 'aktif',
    });

    return NextResponse.json({ message: `User ${newUser.full_name} berhasil dibuat.`, user: newUser });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses permintaan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as {
      id: string;
      full_name?: string;
      email?: string;
      role_name?: UserRole;
      campus_name?: string | null;
      status?: UserStatus;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'ID user wajib diisi.' }, { status: 400 });
    }

    const updated = await adminUpdateUser(body);
    return NextResponse.json({ message: `User ${updated.full_name} berhasil diperbarui.`, user: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui user.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const csrfError = await requireCsrf();
  if (csrfError) return csrfError;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID user wajib diisi.' }, { status: 400 });
    }

    // Prevent self-deletion
    if (auth.user.id === id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif.' }, { status: 400 });
    }

    const success = await adminDeleteUser(id);
    if (!success) {
      return NextResponse.json({ error: 'User tidak ditemukan atau gagal dihapus.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User berhasil dihapus dari sistem.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menghapus user.' }, { status: 500 });
  }
}
