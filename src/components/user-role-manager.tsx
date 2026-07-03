'use client';

import { useMemo, useState } from 'react';
import { Lock, Pencil, Plus, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { canManageUsers, roleDescriptions, roles } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/lib/types';

type DraftUser = {
  id?: string;
  full_name: string;
  email: string;
  role_name: UserRole;
  campus_name: string;
  status: 'aktif' | 'nonaktif';
};

type RolePermission = {
  role: UserRole;
  scope: string;
  permissions: string[];
};

const rolePermissions: RolePermission[] = [
  { role: 'Superadmin', scope: 'Global semua kampus', permissions: ['Kelola user & role', 'Kelola master data', 'CRUD semua aset', 'Verifikasi semua data', 'Export laporan'] },
  { role: 'Admin Aset', scope: 'Global semua kampus', permissions: ['CRUD semua aset', 'Verifikasi/approve data semua kampus', 'Kelola dokumen aset', 'Export laporan semua kampus'] },
  { role: 'Operator Kampus', scope: 'Per kampus', permissions: ['Input aset kampusnya', 'Upload foto/dokumen', 'Ajukan verifikasi', 'Tidak bisa approve sendiri'] },
  { role: 'Pimpinan Dashboard', scope: 'Dashboard saja', permissions: ['View-only dashboard', 'Lihat peta/statistik', 'Tanpa CRUD', 'Tanpa export data'] },
];

const demoUsers: UserProfile[] = [
  { id: 'demo-superadmin', full_name: 'Superadmin Sistem', email: 'superadmin@aset.id', role_name: 'Superadmin', campus_name: null, university_name: null, status: 'aktif' },
  { id: 'demo-admin-utama', full_name: 'Admin Aset Kampus Utama', email: 'admin@aset.id', role_name: 'Admin Aset', campus_name: 'Kampus Utama', university_name: 'Kampus Utama', status: 'aktif' },
  { id: 'demo-operator-utama', full_name: 'Operator Kampus Utama', email: 'operator@aset.id', role_name: 'Operator Kampus', campus_name: 'Kampus Utama', university_name: 'Kampus Utama', status: 'aktif' },
  { id: 'demo-pimpinan', full_name: 'Pimpinan Universitas', email: 'pimpinan@aset.id', role_name: 'Pimpinan Dashboard', campus_name: null, university_name: null, status: 'aktif' },
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

export function UserRoleManager({ currentRole, campusOptions }: { currentRole: UserRole; campusOptions: string[] }) {
  const canManage = canManageUsers(currentRole);
  const [users, setUsers] = useState<UserProfile[]>(demoUsers.map(normalizeUser));
  const [draft, setDraft] = useState<DraftUser | null>(null);
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Tahap 1: CRUD profile user siap. Pembuatan Auth user tetap melalui PostgreSQL lokal Dashboard / invite.' : 'Mode demo: perubahan User & Role tersimpan lokal di halaman ini.');

  const sortedCampusOptions = useMemo(() => {
    const values = Array.from(new Set([...campusOptions, 'Kampus Utama'].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id-ID'));
    return values.length ? values : ['Kampus Utama'];
  }, [campusOptions]);

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
        setMessage(`Gagal update profile PostgreSQL lokal: ${error.message}`);
        return;
      }
    }

    setUsers((current) => {
      const exists = current.some((user) => user.id === nextUser.id);
      return exists ? current.map((user) => user.id === nextUser.id ? nextUser : user) : [nextUser, ...current];
    });
    setMessage(isSupabaseConfigured && nextUser.id.startsWith('demo-') ? 'Draft user tersimpan lokal. Untuk user login nyata, buat Auth user/invite di PostgreSQL lokal lalu edit profilnya.' : 'User berhasil disimpan.');
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

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="users">
      <div className="flex flex-col gap-4 border-b border-sky-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"><ShieldCheck className="mr-2 h-4 w-4" /> Role guard tahap 1</p>
          <h3 className="text-lg font-black">User & Role</h3>
          <p className="mt-1 text-sm text-slate-500">Role dibatasi: Superadmin, Admin Aset semua kampus, Operator Kampus per kampus, dan Pimpinan Dashboard tanpa export.</p>
          {!canManage && <p className="mt-2 text-xs font-black text-amber-600">Hanya Superadmin yang boleh mengubah user dan role.</p>}
          <p className="mt-2 text-xs font-bold text-slate-500">{message}</p>
        </div>
        <button type="button" onClick={openCreate} disabled={!canManage} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"><Plus className="h-4 w-4" /> Tambah User</button>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white/70">
          <div className="grid grid-cols-[1.2fr_.9fr_.8fr_.6fr_.7fr] gap-3 border-b border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>User</span><span>Role</span><span>Kampus</span><span>Status</span><span>Aksi</span>
          </div>
          <div className="divide-y divide-sky-100">
            {users.map((user) => <div key={user.id} className="grid grid-cols-[1.2fr_.9fr_.8fr_.6fr_.7fr] items-center gap-3 px-4 py-4 text-sm">
              <div className="min-w-0"><p className="truncate font-black text-slate-900">{user.full_name}</p><p className="truncate text-xs font-semibold text-slate-500">{user.email}</p></div>
              <div className="font-bold text-sky-700">{user.role_name}</div>
              <div className="text-slate-600">{user.campus_name ?? user.university_name ?? 'Semua'}</div>
              <div><span className={`rounded-full px-3 py-1 text-xs font-black ${user.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.status}</span></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(user)} disabled={!canManage} className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-sky-700 disabled:text-slate-300"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => toggleStatus(user)} disabled={!canManage} className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-slate-600 disabled:text-slate-300"><Lock className="h-4 w-4" /></button>
              </div>
            </div>)}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
            <h4 className="mb-3 flex items-center gap-2 font-black"><UsersRound className="h-5 w-5 text-sky-700" /> Matriks Role</h4>
            <div className="grid gap-3">
              {rolePermissions.map((item) => <div key={item.role} className="rounded-2xl bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><h5 className="font-black text-slate-900">{item.role}</h5><p className="mt-1 text-xs font-bold text-sky-700">Scope: {item.scope}</p></div><UserRound className="h-5 w-5 text-sky-600" /></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{roleDescriptions[item.role]}</p>
                <ul className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">{item.permissions.map((permission) => <li key={permission}>• {permission}</li>)}</ul>
              </div>)}
            </div>
          </div>
        </div>
      </div>

      {draft && <form onSubmit={saveDraft} className="border-t border-sky-100 bg-sky-50/50 p-5">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h4 className="text-lg font-black">{draft.id ? 'Edit User' : 'Tambah User'}</h4><p className="mt-1 text-sm text-slate-500">Operator wajib punya scope kampus. Admin Aset otomatis melihat semua kampus.</p></div><button type="button" onClick={closeForm} className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-bold text-slate-700 xl:col-span-1">Nama<input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 xl:col-span-1">Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Role<select value={draft.role_name} onChange={(event) => setDraft({ ...draft, role_name: event.target.value as UserRole })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Kampus<select value={draft.campus_name} onChange={(event) => setDraft({ ...draft, campus_name: event.target.value })} disabled={draft.role_name !== 'Operator Kampus'} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400">{sortedCampusOptions.map((campus) => <option key={campus} value={campus}>{campus}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as 'aktif' | 'nonaktif' })} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></label>
        </div>
        <div className="mt-4 flex justify-end"><button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Simpan User</button></div>
      </form>}
    </section>
  );
}
