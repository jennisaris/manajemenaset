'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { roles } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { UserRegistrationModal } from '@/components/user-registration-modal';
import type { UserRole } from '@/lib/types';

type AuthPanelProps = {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  campusOptions?: string[];
};

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  status: 'aktif' | 'nonaktif' | null;
  roles: { name: UserRole | null } | { name: UserRole | null }[] | null;
};

function resolveRole(row: ProfileRow | null): UserRole {
  const roleValue = Array.isArray(row?.roles) ? row?.roles[0]?.name : row?.roles?.name;
  return roleValue && roles.includes(roleValue) ? roleValue : 'Admin Aset';
}

export function AuthPanel({ role, onRoleChange, campusOptions = [] }: AuthPanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('admin@aset.id');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('Admin Demo');
  const [status, setStatus] = useState<'demo' | 'idle' | 'loading' | 'signed-in' | 'error'>(isSupabaseConfigured ? 'idle' : 'demo');
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Login PostgreSQL lokal siap digunakan setelah user dibuat.' : 'Mode demo: PostgreSQL lokal env belum diisi, gunakan role selector untuk simulasi akses.');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setStatus('loading');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name,email,status,roles(name)')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>();

      setFullName(profile?.full_name ?? user.email ?? 'User PostgreSQL lokal');
      setEmail(profile?.email ?? user.email ?? '');
      onRoleChange(resolveRole(profile ?? null));
      setStatus('signed-in');
      setMessage('Session PostgreSQL lokal aktif. Role diambil dari tabel profiles → roles.');
    });
  }, [onRoleChange]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setStatus('demo');
      setMessage('Mode demo aktif. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY untuk login nyata.');
      return;
    }

    setStatus('loading');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setStatus('error');
      setMessage(error?.message ?? 'Login gagal. Periksa email dan password.');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,email,status,roles(name)')
      .eq('id', data.user.id)
      .maybeSingle<ProfileRow>();

    setFullName(profile?.full_name ?? data.user.email ?? 'User PostgreSQL lokal');
    onRoleChange(resolveRole(profile ?? null));
    setStatus('signed-in');
    setMessage('Login berhasil. Hak akses mengikuti role profil.');
  }

  async function handleSignOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setStatus(isSupabaseConfigured ? 'idle' : 'demo');
    setPassword('');
    setMessage(isSupabaseConfigured ? 'Session keluar. Silakan login kembali.' : 'Mode demo tetap aktif.');
  }

  if (!isMounted) {
    return (
      <section className="mb-5 rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl min-h-[160px] grid place-items-center" id="auth">
        <div className="text-sm font-semibold text-slate-500">Memuat panel autentikasi...</div>
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="auth">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"><ShieldCheck className="mr-2 h-4 w-4" /> PostgreSQL lokal Auth & Role Guard</p>
          <h3 className="text-lg font-black">Akses pengguna</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Role aktif: <strong className="text-slate-800">{role}</strong>. CRUD aset dibuka untuk Superadmin, Admin Aset, dan Operator Kampus.</p>
          <p className={`mt-2 text-xs font-bold ${status === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>
        </div>

        <form onSubmit={handleLogin} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:min-w-[620px]">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@aset.id / operator@aset.id" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="admin123 / operator123" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
          <button type="submit" disabled={status === 'loading'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:opacity-60"><LogIn className="h-4 w-4" />{status === 'loading' ? 'Memeriksa...' : 'Login'}</button>
        </form>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">User aktif: <strong>{status === 'signed-in' ? fullName : 'Demo Lokal'}</strong></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={role} onChange={(event) => onRoleChange(event.target.value as UserRole)} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => setIsRegisterOpen(true)} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-100 transition">
            + Daftar Akun Operator
          </button>
          <button type="button" onClick={handleSignOut} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600">Keluar / Reset Demo</button>
        </div>
      </div>

      <UserRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        campusOptions={campusOptions}
      />
    </section>
  );
}
