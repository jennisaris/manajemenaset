'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, GraduationCap, KeyRound, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { Dashboard } from '@/components/dashboard';
import { Sidebar } from '@/components/sidebar';
import { UserRegistrationModal } from '@/components/user-registration-modal';
import { apiJson } from '@/lib/api-client';
import type { Asset, AssetIssue, DashboardSummary, UserRole, Utilization } from '@/lib/types';

type AuthState = 'checking' | 'login' | 'loading' | 'authenticated' | 'error';
type MvpData = { assets: Asset[]; summary: DashboardSummary; utilizations: Utilization[]; issues: AssetIssue[]; pagination?: { assets: { limit: number; offset: number; total: number; returned: number; hasMore: boolean } } };
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
  const [isMounted, setIsMounted] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [email, setEmail] = useState('superadmin@aset.id');
  const [password, setPassword] = useState('superadmin123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('Superadmin');
  const [fullName, setFullName] = useState('Superadmin Tim Pusat');
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [message, setMessage] = useState('Memeriksa sesi pengguna lokal...');
  const [data, setData] = useState<MvpData>({ assets: [], summary: emptySummary(), utilizations: [], issues: [] });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    setUniversityName(user.role === 'Operator Kampus' ? user.university_name ?? null : null);
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


  async function loadMoreAssets() {
    const page = data.pagination?.assets;
    if (!page?.hasMore || isDashboardLoading) return;
    setIsDashboardLoading(true);
    try {
      const nextData = await apiJson<MvpData>(`/api/mvp-data?assetLimit=${page.limit}&assetOffset=${page.offset + page.returned}`);
      setData({
        ...nextData,
        assets: [...data.assets, ...nextData.assets],
      });
    } finally {
      setIsDashboardLoading(false);
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
      <div suppressHydrationWarning className="h-screen w-screen overflow-hidden bg-white text-foreground antialiased flex flex-col font-sans">
        {/* Top Navbar - Kemdiktisaintek style */}
        <nav className="h-16 shrink-0 bg-white border-b border-border z-50">
          <div className="flex items-center justify-between px-6 sm:px-8 h-full w-full">
            {/* Logo */}
            <div className="flex items-center gap-3.5">
              <img src="/images/logo-dikti.png" alt="Logo Kemdiktisaintek" className="h-11 w-auto object-contain" />
              <h1 className="font-extrabold text-base sm:text-lg lg:text-xl text-foreground tracking-tight leading-snug">
                Kementerian Pendidikan Tinggi, Sains, dan Teknologi
              </h1>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Daftar Operator
              </button>
              <a href="#help" className="text-secondary hover:text-primary font-medium transition-colors">
                Panduan
              </a>
            </div>
          </div>
        </nav>

        {/* Main Layout - Fits screen height */}
        <div className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden">
          {/* Left Column - Image & Hero Banner with Soft Blue Theme */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative h-full bg-gradient-to-br from-info-light via-blue-100 to-sky-200 overflow-hidden border-r border-border">
            <img
              src="/images/gedung-dikti.jpg"
              alt="Gedung Kemdiktisaintek"
              className="w-full h-full object-cover opacity-40 mix-blend-multiply transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-100/90 via-transparent to-transparent p-8 xl:p-14 flex flex-col justify-start pt-12 xl:pt-16 gap-6 z-10 text-foreground">
              {/* Hero Text */}
              <div className="w-full space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/90 px-4 py-2 backdrop-blur-md text-xs font-bold tracking-wide text-primary shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Portal Resmi SMART-DIKTI
                </div>

                <h2 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-tight text-foreground whitespace-nowrap">
                  SMART-<span className="bg-gradient-to-r from-primary to-info-dark bg-clip-text text-transparent">DIKTI</span>
                </h2>

                <p className="text-base xl:text-lg text-slate-900 leading-relaxed font-bold max-w-3xl text-justify">
                  Sistem Management & Asset Real-Time Diktisaintek — Platform terpadu pemantauan tanah, bangunan, sertifikasi legalitas, dan pemanfaatan aset secara transparan dan akurat.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-3 border-t border-slate-300/80 max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/90 px-4 py-2 backdrop-blur-md text-xs font-bold tracking-wide text-primary shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                    Integrasi Data
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-white/90 px-4 py-2 backdrop-blur-md text-xs font-bold tracking-wide text-emerald-700 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    Akses Berjenjang
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-600/20 bg-white/90 px-4 py-2 backdrop-blur-md text-xs font-bold tracking-wide text-amber-700 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                    Peta GIS & Laporan
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="flex-1 lg:w-1/2 xl:w-2/5 h-full flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto bg-muted">
            <div className="w-full max-w-md my-auto">
              {/* Welcome Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <img src="/images/logo-dikti.png" alt="Logo SMART-DIKTI" className="h-12 w-auto object-contain" />
                  <h1 className="font-bold text-2xl text-primary">SMART-DIKTI</h1>
                </div>
                <h2 className="text-foreground text-2xl font-bold mb-1">
                  Selamat Datang Kembali
                </h2>
                <p className="text-secondary text-sm font-medium">Silakan login untuk mengakses portal SMART-DIKTI</p>
              </div>

              {/* Login Card */}
              <div className="bg-white rounded-card border border-border p-6 md:p-8 shadow-xl shadow-slate-200/50">
                <form onSubmit={handleLogin} className="space-y-4">
                  {message && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-semibold leading-relaxed border ${authState === 'error'
                        ? 'bg-error-light text-error-dark border-error-light'
                        : 'bg-info-light text-primary border-info-light'
                        }`}
                    >
                      {message}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-foreground text-xs font-medium">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="superadmin@aset.id atau email terdaftar"
                      className="w-full px-4 py-3 border border-border rounded-button text-xs font-medium text-foreground placeholder:text-gray-400 focus:outline-none focus:border-primary transition-all duration-200 bg-gray-50"
                    />
                  </div>

                  {/* Password Field with Eye Toggle */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-foreground text-xs font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-12 border border-border rounded-button text-xs font-medium text-foreground placeholder:text-gray-400 focus:outline-none focus:border-primary transition-all duration-200 bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground cursor-pointer transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Accounts */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-secondary">Akun Quick Login:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('superadmin@aset.id');
                          setPassword('superadmin123');
                        }}
                        className="rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition cursor-pointer shadow-xs"
                      >
                        Superuser (Superadmin)
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={!isMounted || authState === 'checking' || authState === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-60 text-xs sm:text-sm"
                  >
                    <KeyRound className="w-4 h-4" />
                    {!isMounted || authState === 'loading' || authState === 'checking' ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-white text-secondary">Atau belum punya akun?</span>
                    </div>
                  </div>

                  {/* Register Button */}
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-primary/20 bg-primary/5 text-primary rounded-button font-semibold hover:bg-primary/10 transition-all duration-200 cursor-pointer text-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftar Akun Operator Baru
                  </button>
                </form>
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-center gap-4 mt-6 text-xs text-secondary">
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
                <span>•</span>
                <span>Kemdiktisaintek v1.0</span>
              </div>
            </div>
          </div>
        </div>

        <UserRegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      </div>
    );
  }


  return (
    <div suppressHydrationWarning className="relative min-h-screen bg-[#EFF2F7] text-[#080C1A] antialiased">
      <BottomNav />
      <Sidebar
        currentRole={role}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      {isDashboardLoading ? (
        <main className="grid min-h-screen place-items-center px-4 py-10 lg:pl-[280px]">
          <div className="rounded-3xl border border-[#F3F4F3] bg-white px-6 py-5 text-sm font-bold text-[#165DFF] shadow-lg">
            Memuat data dashboard...
          </div>
        </main>
      ) : (
        <>
          <Dashboard
            assets={data.assets}
            summary={data.summary}
            utilizations={data.utilizations}
            issues={data.issues}
            currentRole={role}
            fullName={fullName}
            universityName={universityName}
            onSignOut={handleSignOut}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
          {data.pagination?.assets.hasMore && (
            <button
              type="button"
              onClick={loadMoreAssets}
              disabled={isDashboardLoading}
              className="fixed bottom-24 right-5 z-40 rounded-full bg-primary px-5 py-3 text-xs font-bold text-white shadow-xl shadow-primary/30 transition hover:bg-primary-hover disabled:opacity-60 lg:bottom-6"
            >
              Muat aset berikutnya ({data.assets.length}/{data.pagination.assets.total})
            </button>
          )}
        </>
      )}
    </div>
  );
}
