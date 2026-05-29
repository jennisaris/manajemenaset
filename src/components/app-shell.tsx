'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { Dashboard } from '@/components/dashboard';
import { Sidebar } from '@/components/sidebar';
import { apiJson } from '@/lib/api-client';
import type { Asset, AssetIssue, DashboardSummary, UserRole, Utilization } from '@/lib/types';

type AuthState = 'checking' | 'login' | 'loading' | 'authenticated' | 'error';
type MvpData = { assets: Asset[]; summary: DashboardSummary; utilizations: Utilization[]; issues: AssetIssue[] };
type SessionResponse = { user: { id: string; email: string; full_name: string; role: UserRole; university_name: string | null; status: 'aktif' | 'nonaktif' } | null };

function emptySummary(): DashboardSummary {
  return { total_land: 0, total_building: 0, total_land_area_m2: 0, total_building_area_m2: 0, verified_assets: 0, pending_verification: 0, active_utilizations: 0, active_issues: 0 };
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export function AppShell() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [email, setEmail] = useState('admin@aset.id');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState<UserRole>('Admin Aset');
  const [fullName, setFullName] = useState('Admin Demo');
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [message, setMessage] = useState('Memeriksa sesi pengguna lokal...');
  const [data, setData] = useState<MvpData>({ assets: [], summary: emptySummary(), utilizations: [], issues: [] });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  async function loadDashboardData() {
    setIsDashboardLoading(true);
    try {
      const nextData = await apiJson<MvpData>('/api/mvp-data');
      setData(nextData);
    } finally {
      setIsDashboardLoading(false);
    }
  }

  function applySession(user: NonNullable<SessionResponse['user']>) {
    setFullName(user.full_name || user.email || 'User Lokal');
    setEmail(user.email ?? '');
    setRole(user.role);
    setUniversityName(['Admin Aset', 'Operator Kampus'].includes(user.role) ? user.university_name ?? null : null);
  }

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const response = await withTimeout(apiJson<SessionResponse>('/api/auth/session'), 5000, 'Pengecekan sesi terlalu lama.');
        if (!isMounted || !response.user) return;
        applySession(response.user);
        await loadDashboardData();
        if (!isMounted) return;
        setAuthState('authenticated');
        setMessage('Session aktif.');
      } catch {
        if (!isMounted) return;
        setAuthState('login');
        setMessage('Silakan login untuk masuk dashboard aset.');
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthState('loading');

    try {
      const response = await withTimeout(
        apiJson<SessionResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        10000,
        'Login terlalu lama. Coba lagi.',
      );
      if (!response.user) throw new Error('Login gagal. Session tidak terbentuk.');
      applySession(response.user);
      await loadDashboardData();
      setAuthState('authenticated');
      setMessage('Login berhasil.');
    } catch (error) {
      setAuthState('error');
      setMessage(error instanceof Error ? error.message : 'Login gagal. Coba lagi.');
    }
  }

  async function handleSignOut() {
    await apiJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => null);
    setPassword('');
    setUniversityName(null);
    setData({ assets: [], summary: emptySummary(), utilizations: [], issues: [] });
    setAuthState('login');
    setMessage('Session keluar. Silakan login kembali.');
  }

  if (authState !== 'authenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_8%_4%,rgba(126,211,255,.38),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(255,255,255,.9),transparent_24%),linear-gradient(135deg,#f4fbff_0%,#ffffff_48%,#eaf8ff_100%)] px-4 py-10 text-slate-950 antialiased">
        <section className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 shadow-[0_24px_90px_rgba(22,118,194,.18)] backdrop-blur-xl lg:grid lg:grid-cols-[1fr_.9fr]">
          <div className="relative min-h-[360px] bg-gradient-to-br from-sky-500 via-blue-700 to-slate-950 p-8 text-white lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,.28),transparent_28%),radial-gradient(circle_at_78%_72%,rgba(125,211,252,.22),transparent_24%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div>
                <div className="mb-8 inline-flex rounded-3xl bg-white px-5 py-3 shadow-[0_18px_50px_rgba(2,6,23,.18)]">
                  <Image src="/kemdiktisaintek-logo.jpg" alt="Logo Kemdiktisaintek" width={640} height={160} priority className="h-12 w-auto object-contain sm:h-14" />
                </div>
                <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-sky-100"><ShieldCheck className="mr-2 h-4 w-4" /> Secure Asset Portal</p>
                <h1 className="mt-8 max-w-xl text-4xl font-black tracking-tight md:text-5xl">Sistem Manajemen Aset Universitas</h1>
                <p className="mt-4 max-w-lg text-sm leading-7 text-sky-100">Masuk terlebih dahulu untuk mengakses dashboard, peta aset, CRUD, dokumen, dan pemanfaatan aset.</p>
              </div>
              <div className="grid gap-3 text-sm text-sky-50 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><strong className="block text-lg">Auth</strong>Login Lokal</div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><strong className="block text-lg">Role</strong>Guard CRUD</div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><strong className="block text-lg">Storage</strong>Foto Aset</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="grid content-center gap-5 p-6 sm:p-8 lg:p-10">
            <div>
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-700"><LockKeyhole className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black">Login Dashboard</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${authState === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="admin@aset.id / operator@aset.id" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="admin123 / operator123" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </label>
            <button type="submit" disabled={authState === 'checking' || authState === 'loading'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:opacity-60"><KeyRound className="h-4 w-4" />{authState === 'loading' || authState === 'checking' ? 'Memeriksa...' : 'Masuk'}</button>
            <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-bold leading-5 text-sky-700">Backend lokal PostgreSQL aktif melalui API server-side; data dashboard baru dimuat setelah login berhasil.</p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_4%,rgba(126,211,255,.38),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(255,255,255,.9),transparent_24%),linear-gradient(135deg,#f4fbff_0%,#ffffff_48%,#eaf8ff_100%)] text-slate-950 antialiased lg:grid lg:grid-cols-[280px_1fr]">
      <BottomNav />
      <Sidebar currentRole={role} />
      {isDashboardLoading ? (
        <main className="grid min-h-screen place-items-center px-4 py-10"><div className="rounded-3xl border border-sky-100 bg-white/90 px-6 py-5 text-sm font-black text-sky-700 shadow-lg">Memuat data dashboard...</div></main>
      ) : (
        <Dashboard assets={data.assets} summary={data.summary} utilizations={data.utilizations} issues={data.issues} currentRole={role} fullName={fullName} universityName={universityName} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
