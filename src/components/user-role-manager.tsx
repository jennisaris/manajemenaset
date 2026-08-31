'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, Lock, Pencil, Plus, ShieldCheck, UserCheck, UserRound, UsersRound, X, XCircle } from 'lucide-react';
import { canManageUsers, roleDescriptions, roles } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/lib/types';

type DraftUser = {
  id?: string;
  full_name: string;
  email: string;
  role_name: UserRole;
  campus_name: string;
  status: 'aktif' | 'nonaktif' | 'menunggu_persetujuan' | 'ditolak';
};

type RolePermission = {
  role: UserRole;
  scope: string;
  permissions: string[];
};

const rolePermissions: RolePermission[] = [
  { role: 'Superadmin', scope: 'Global semua Satker / PTN', permissions: ['Kelola user & approval registrasi', 'Verifikasi & approve aset baru', 'Verifikasi & SK penghapusan BMN', 'Akses analitik & laporan'] },
  { role: 'Operator Kampus', scope: 'Per Satker / Kampus', permissions: ['Input aset single & massal Excel', 'Upload foto & GIS koordinat', 'Ajukan usulan penghapusan BMN', 'Lihat data Satkernya'] },
  { role: 'Pimpinan Dashboard', scope: 'Monitoring Eksekutif', permissions: ['Monitoring peta GIS & KPI', 'Lihat statistik portofolio', 'Akses laporan & analitik eksekutif', 'Tanpa fitur CRUD'] },
];

const demoUsers: UserProfile[] = [
  { id: 'demo-superadmin', full_name: 'Superadmin Tim Pusat', email: 'superadmin@aset.id', role_name: 'Superadmin', campus_name: null, university_name: null, status: 'aktif' },
];

function emptyDraft(campusOptions: string[]): DraftUser {
  return { full_name: '', email: '', role_name: 'Operator Kampus', campus_name: campusOptions[0] ?? 'Kampus Utama', status: 'aktif' };
}

function roleToId(role: UserRole) {
  return roles.indexOf(role) + 1;
}

function normalizeUser(profile: UserProfile): UserProfile {
  return { ...profile, campus_name: profile.campus_name ?? profile.university_name ?? null, university_name: profile.university_name ?? profile.campus_name ?? null };
}

export function UserRoleManager({
  currentRole,
  campusOptions,
  initialTab = 'all',
}: {
  currentRole: UserRole;
  campusOptions: string[];
  initialTab?: 'all' | 'pending';
}) {
  const canManage = canManageUsers(currentRole);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [users, setUsers] = useState<UserProfile[]>(demoUsers.map(normalizeUser));
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [draft, setDraft] = useState<DraftUser | null>(null);

  // Approval / Rejection Modal State
  const [approveTarget, setApproveTarget] = useState<UserProfile | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('Operator Kampus');
  const [approveCampus, setApproveCampus] = useState<string>(campusOptions[0] ?? 'Kampus Utama');

  const [rejectTarget, setRejectTarget] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [loadingAction, setLoadingAction] = useState(false);
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Kelola user dan persetujuan akun operator baru.' : 'Mode demo: perubahan User & Role tersimpan di repositori lokal.');

  const sortedCampusOptions = useMemo(() => {
    const values = Array.from(new Set([...campusOptions, 'Kampus Utama'].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id-ID'));
    return values.length ? values : ['Kampus Utama'];
  }, [campusOptions]);

  async function loadPendingUsers() {
    try {
      const res = await fetch('/api/admin/users?status=pending');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setPendingUsers(data.users);
        }
      }
    } catch {
      // Ignore API fetch errors in offline demo mode
    }
  }

  useEffect(() => {
    if (canManage) {
      loadPendingUsers();
    }
  }, [canManage]);

  function openCreate() {
    if (!canManage) return;
    setDraft(emptyDraft(sortedCampusOptions));
  }

  function openEdit(user: UserProfile) {
    if (!canManage) return;
    setDraft({ id: user.id, full_name: user.full_name, email: user.email ?? '', role_name: user.role_name, campus_name: user.campus_name ?? user.university_name ?? sortedCampusOptions[0] ?? 'Kampus Utama', status: user.status });
  }

  function closeForm() {
    setDraft(null);
  }

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !canManage) return;
    const scopedCampus = draft.role_name === 'Operator Kampus' ? draft.campus_name.trim() : null;
    const nextUser: UserProfile = {
      id: draft.id ?? `demo-${Date.now()}`,
      full_name: draft.full_name.trim(),
      email: draft.email.trim(),
      role_name: draft.role_name,
      campus_name: scopedCampus,
      university_name: scopedCampus,
      status: draft.status,
    };

    if (!nextUser.full_name || !nextUser.email) {
      setMessage('Nama dan email wajib diisi.');
      return;
    }

    if (isSupabaseConfigured && !nextUser.id.startsWith('demo-')) {
      const { error } = await supabase.from('profiles').update({
        full_name: nextUser.full_name,
        email: nextUser.email,
        role_id: roleToId(nextUser.role_name),
        university_name: nextUser.university_name,
        status: nextUser.status,
      }).eq('id', nextUser.id);
      if (error) {
        setMessage(`Gagal update profile: ${error.message}`);
        return;
      }
    }

    setUsers((current) => {
      const exists = current.some((user) => user.id === nextUser.id);
      return exists ? current.map((user) => user.id === nextUser.id ? nextUser : user) : [nextUser, ...current];
    });
    setMessage('User berhasil disimpan.');
    closeForm();
  }

  async function toggleStatus(user: UserProfile) {
    if (!canManage) return;
    const nextStatus = user.status === 'aktif' ? 'nonaktif' : 'aktif';
    if (isSupabaseConfigured && !user.id.startsWith('demo-')) {
      const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id);
      if (error) {
        setMessage(`Gagal mengubah status: ${error.message}`);
        return;
      }
    }
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item));
    setMessage(`User ${user.full_name} diubah menjadi ${nextStatus}.`);
  }

  async function handleApproveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!approveTarget) return;
    setLoadingAction(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: approveTarget.id,
          action: 'approve',
          role_name: approveRole,
          campus_name: approveCampus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyetujui user.');

      setMessage(`Pendaftaran ${approveTarget.full_name} berhasil disetujui sebagai ${approveRole}.`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== approveTarget.id));
      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
      }
      setApproveTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menyetujui user.');
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectTarget) return;
    setLoadingAction(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rejectTarget.id,
          action: 'reject',
          rejection_reason: rejectReason.trim() || 'Dokumen Surat Penunjukan Operator belum sesuai.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menolak user.');

      setMessage(`Pendaftaran ${rejectTarget.full_name} berhasil ditolak.`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menolak user.');
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-card border border-border bg-white shadow-sm" id="users">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 border-b border-border p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-info-light px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="mr-2 h-4 w-4" /> User & Role Management
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground">Manajemen Pengguna & Persetujuan Operator</h3>
          <p className="mt-1 text-xs text-secondary">Kelola daftar pengguna aktif dan tinjau pendaftaran akun operator baru yang membutuhkan persetujuan Admin.</p>
          {!canManage && <p className="mt-2 text-xs font-semibold text-warning-dark">Hanya Superadmin yang boleh mengubah user dan menyetujui pendaftaran.</p>}
          <p className="mt-2 text-xs font-medium text-secondary">{message}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            disabled={!canManage}
            className="inline-flex items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition duration-200 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Plus className="h-4 w-4" /> Tambah User Direct
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border bg-muted px-6">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'border-primary text-primary bg-white shadow-sm'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
        >
          <UsersRound className="h-4 w-4" />
          Daftar User Sistem ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition-all ${
            activeTab === 'pending'
              ? 'border-primary text-primary bg-white shadow-sm'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Persetujuan User Baru (Pending)
          {pendingUsers.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-white">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Areas */}
      <div className="p-5">
        {activeTab === 'pending' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-600" />
                Permohonan Pendaftaran Operator Baru ({pendingUsers.length})
              </h4>
              <button
                type="button"
                onClick={loadPendingUsers}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                ↻ Muat Ulang Data
              </button>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <h5 className="font-bold text-slate-800 text-sm">Tidak Ada Permohonan Pending</h5>
                <p className="text-xs text-slate-500 mt-1">Semua pendaftaran operator baru telah diproses atau belum ada permohonan baru.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white">
                <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr_1fr] gap-3 border-b border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                  <span>Pemohon (NIP)</span>
                  <span>Satuan Kerja</span>
                  <span>Kontak (Email/HP)</span>
                  <span>Surat Penunjukan Operator</span>
                  <span>Status</span>
                  <span>Aksi Persetujuan</span>
                </div>
                <div className="divide-y divide-sky-100">
                  {pendingUsers.map((pUser) => (
                    <div key={pUser.id} className="grid grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr_1fr] items-center gap-3 px-4 py-4 text-xs">
                      <div>
                        <p className="font-black text-slate-900">{pUser.full_name}</p>
                        <p className="text-[11px] font-semibold text-slate-500">NIP: {pUser.nip || '-'}</p>
                      </div>

                      <div className="font-semibold text-slate-700">
                        {pUser.kode_satker && <span className="font-bold text-sky-700 mr-1">[{pUser.kode_satker}]</span>}
                        {pUser.satuan_kerja || pUser.university_name || '-'}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">{pUser.email}</p>
                        <p className="text-[11px] text-slate-500">{pUser.phone_number || '-'}</p>
                      </div>

                      <div>
                        {pUser.assignment_letter_url || pUser.assignment_letter_path ? (
                          <a
                            href={pUser.assignment_letter_url || `/uploads/${pUser.assignment_letter_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 font-bold text-sky-700 hover:bg-sky-100 transition"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">{pUser.assignment_letter_name || 'Lihat Surat'}</span>
                            <Download className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Tidak ada berkas</span>
                        )}
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700 border border-amber-200 text-[11px]">
                          Menunggu Persetujuan
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setApproveTarget(pUser);
                            setApproveRole('Operator Kampus');
                            setApproveCampus(pUser.satuan_kerja || sortedCampusOptions[0] || 'Kampus Utama');
                          }}
                          disabled={!canManage}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(pUser);
                            setRejectReason('');
                          }}
                          disabled={!canManage}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white/70">
              <div className="grid grid-cols-[1.2fr_.9fr_.8fr_.6fr_.7fr] gap-3 border-b border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                <span>User</span><span>Role</span><span>Kampus</span><span>Status</span><span>Aksi</span>
              </div>
              <div className="divide-y divide-sky-100">
                {users.map((user) => (
                  <div key={user.id} className="grid grid-cols-[1.2fr_.9fr_.8fr_.6fr_.7fr] items-center gap-3 px-4 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">{user.full_name}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
                    </div>
                    <div className="font-bold text-sky-700">{user.role_name}</div>
                    <div className="text-slate-600">{user.campus_name ?? user.university_name ?? 'Semua'}</div>
                    <div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${
                        user.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        disabled={!canManage}
                        title="Edit User"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-sky-700 transition hover:bg-sky-50 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:text-slate-300 disabled:scale-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        disabled={!canManage}
                        title={user.status === 'aktif' ? 'Nonaktifkan User' : 'Aktifkan User'}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-slate-600 transition hover:bg-slate-50 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:text-slate-300 disabled:scale-100"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-black"><UsersRound className="h-5 w-5 text-sky-700" /> Matriks Role</h4>
                <div className="grid gap-3">
                  {rolePermissions.map((item) => (
                    <div key={item.role} className="rounded-2xl bg-white/80 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="font-black text-slate-900">{item.role}</h5>
                          <p className="mt-1 text-xs font-bold text-sky-700">Scope: {item.scope}</p>
                        </div>
                        <UserRound className="h-5 w-5 text-sky-600" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{roleDescriptions[item.role]}</p>
                      <ul className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">
                        {item.permissions.map((permission) => <li key={permission}>• {permission}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Direct User Form */}
      {draft && (
        <form onSubmit={saveDraft} className="border-t border-sky-100 bg-sky-50/50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-black">{draft.id ? 'Edit User' : 'Tambah User Direct'}</h4>
              <p className="mt-1 text-sm text-slate-500">Operator wajib punya scope kampus. Admin Aset otomatis melihat semua kampus.</p>
            </div>
            <button type="button" onClick={closeForm} className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold text-slate-700 xl:col-span-1">
              Nama
              <input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 xl:col-span-1">
              Email
              <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Role
              <select value={draft.role_name} onChange={(event) => setDraft({ ...draft, role_name: event.target.value as UserRole })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Kampus
              <select value={draft.campus_name} onChange={(event) => setDraft({ ...draft, campus_name: event.target.value })} disabled={draft.role_name !== 'Operator Kampus'} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400">
                {sortedCampusOptions.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as 'aktif' | 'nonaktif' })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Simpan User</button>
          </div>
        </form>
      )}

      {/* Approval Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base">Persetujuan Pendaftaran User</h4>
              <button type="button" onClick={() => setApproveTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleApproveSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-2xl bg-sky-50 p-3 text-slate-700 border border-sky-100 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{approveTarget.full_name}</p>
                <p>NIP: <strong>{approveTarget.nip || '-'}</strong></p>
                <p>Email: <strong>{approveTarget.email}</strong></p>
                <p>Satuan Kerja: <strong>{approveTarget.satuan_kerja || approveTarget.university_name || '-'}</strong></p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Role Hak Akses <span className="text-rose-500">*</span></label>
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as UserRole)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope Kampus / Unit <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={approveCampus}
                  onChange={(e) => setApproveCampus(e.target.value)}
                  placeholder="Kampus Utama / Fakultas"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loadingAction ? 'Proses...' : 'Setujui & Aktifkan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base">Tolak Pendaftaran User</h4>
              <button type="button" onClick={() => setRejectTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-2xl bg-rose-50 p-3 text-slate-700 border border-rose-100 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{rejectTarget.full_name}</p>
                <p>NIP: <strong>{rejectTarget.nip || '-'}</strong> | Email: <strong>{rejectTarget.email}</strong></p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Penolakan <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Masukkan catatan atau alasan dokumen tidak memenuhi syarat..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="rounded-2xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {loadingAction ? 'Proses...' : 'Tolak Pendaftaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
