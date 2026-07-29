'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Bell,
  Building2,
  CircleAlert,
  Download,
  FileText,
  Handshake,
  Landmark,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  canExportReports,
  canManageAssets,
  canManageUsers,
  canViewAllUniversities,
  canViewExecutiveAnalytics,
} from '@/lib/auth';
import type { Asset, AssetIssue, DashboardSummary, UserRole, Utilization } from '@/lib/types';
import { AssetList } from './asset-list';
import { ChangePasswordPanel } from './change-password-panel';
import { ExecutiveAnalytics } from './executive-analytics';
import { AdminUniversityCharts } from './admin-university-charts';
import { IssueManager } from './issue-manager';
import { MapCard } from './map-card';
import { UtilizationManager } from './utilization-manager';
import { UserRoleManager } from './user-role-manager';

const nf = new Intl.NumberFormat('id-ID');

function StatusPill({
  children,
  tone = 'sky',
}: {
  children: React.ReactNode;
  tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const tones = {
    sky: 'bg-info-light text-primary',
    emerald: 'bg-success-light text-success-dark',
    amber: 'bg-warning-light text-warning-dark',
    rose: 'bg-error-light text-error-dark',
    slate: 'bg-card-grey text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col justify-between rounded-card border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {label}
        </span>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
        <p className="mt-1 text-xs font-medium text-secondary">{helper}</p>
      </div>
    </div>
  );
}

export function Dashboard({
  assets,
  summary,
  utilizations,
  issues,
  currentRole,
  fullName,
  universityName,
  onSignOut,
  onOpenMobileSidebar,
}: {
  assets: Asset[];
  summary: DashboardSummary;
  utilizations: Utilization[];
  issues: AssetIssue[];
  currentRole: UserRole;
  fullName: string;
  universityName: string | null;
  onSignOut: () => void;
  onOpenMobileSidebar?: () => void;
}) {
  const role = currentRole;
  const canViewAll = canViewAllUniversities(role);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [currentAssets, setCurrentAssets] = useState(assets);
  const [currentUtilizations, setCurrentUtilizations] = useState(utilizations);
  const [currentIssues, setCurrentIssues] = useState(issues);

  useEffect(() => {
    setCurrentAssets(assets);
  }, [assets]);

  useEffect(() => {
    setCurrentUtilizations(utilizations);
  }, [utilizations]);

  useEffect(() => {
    setCurrentIssues(issues);
  }, [issues]);

  const universityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          currentAssets
            .map((asset) => asset.campus_name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b, 'id-ID')),
    [currentAssets]
  );

  const effectiveUniversity = canViewAll ? selectedUniversity : universityName ?? '';

  const scopedAssets = useMemo(
    () =>
      effectiveUniversity
        ? currentAssets.filter((asset) => asset.campus_name === effectiveUniversity)
        : currentAssets,
    [currentAssets, effectiveUniversity]
  );

  const scopedAssetIds = useMemo(() => new Set(scopedAssets.map((asset) => asset.id)), [scopedAssets]);

  const scopedUtilizations = useMemo(
    () => currentUtilizations.filter((item) => scopedAssetIds.has(item.asset_id)),
    [currentUtilizations, scopedAssetIds]
  );

  const scopedIssues = useMemo(
    () => currentIssues.filter((issue) => scopedAssetIds.has(issue.asset_id)),
    [currentIssues, scopedAssetIds]
  );

  const displayedAssets = useMemo(
    () =>
      scopedAssets.map((asset) => ({
        ...asset,
        has_active_issue: scopedIssues.some(
          (issue) => issue.asset_id === asset.id && issue.status !== 'selesai'
        ),
        has_active_utilization: scopedUtilizations.some(
          (item) => item.asset_id === asset.id && ['aktif', 'akan_berakhir'].includes(item.status)
        ),
      })),
    [scopedAssets, scopedIssues, scopedUtilizations]
  );

  const liveSummary = useMemo<DashboardSummary>(
    () => ({
      ...summary,
      total_land: displayedAssets.filter((asset) => asset.asset_type === 'land').length,
      total_building: displayedAssets.filter((asset) => asset.asset_type === 'building').length,
      verified_assets: displayedAssets.filter((asset) => asset.verification_status === 'terverifikasi').length,
      pending_verification: displayedAssets.filter(
        (asset) => asset.verification_status === 'menunggu_verifikasi'
      ).length,
      active_issues: scopedIssues.filter((issue) => issue.status !== 'selesai').length,
      active_utilizations: scopedUtilizations.filter((item) =>
        ['aktif', 'akan_berakhir'].includes(item.status)
      ).length,
    }),
    [displayedAssets, scopedIssues, scopedUtilizations, summary]
  );

  const canManage = canManageAssets(role);
  const showExecutiveAnalytics = canViewExecutiveAnalytics(role);
  const canExport = canExportReports(role);
  const canManageUserRole = canManageUsers(role);

  const [activeHash, setActiveHash] = useState('');
  const pageHash = activeHash || '#dashboard';
  const isDashboardPage = pageHash === '#dashboard';

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const getPageTitle = () => {
    switch (pageHash) {
      case '#dashboard':
        return 'Dashboard';
      case '#asset-list':
        return 'Data Aset Universitas';
      case '#verification':
        return 'Verifikasi Aset';
      case '#utilization':
        return 'Pemanfaatan Aset';
      case '#issues':
        return 'Permasalahan Aset';
      case '#reports':
        return 'Laporan & Dokumen';
      case '#users':
        return 'Manajemen User & Role';
      case '#analytics':
        return 'Analitik Eksekutif';
      case '#change-password':
        return 'Ubah Password';
      default:
        return 'Kemdiktisaintek Dashboard';
    }
  };

  function handleAssetsChange(nextAssets: Asset[]) {
    const nextAssetIds = new Set(nextAssets.map((asset) => asset.id));
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentAssets((current) =>
      effectiveUniversity
        ? [...current.filter((asset) => asset.campus_name !== effectiveUniversity), ...nextAssets]
        : nextAssets
    );
    setCurrentIssues((current) =>
      current.filter((issue) =>
        effectiveUniversity && !scopedIds.has(issue.asset_id) ? true : nextAssetIds.has(issue.asset_id)
      )
    );
  }

  function handleUtilizationsChange(nextUtilizations: Utilization[]) {
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentUtilizations((current) =>
      effectiveUniversity
        ? [...current.filter((item) => !scopedIds.has(item.asset_id)), ...nextUtilizations]
        : nextUtilizations
    );
  }

  function handleIssuesChange(nextIssues: AssetIssue[]) {
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentIssues((current) =>
      effectiveUniversity
        ? [...current.filter((issue) => !scopedIds.has(issue.asset_id)), ...nextIssues]
        : nextIssues
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-muted lg:pl-[280px]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex h-[90px] w-full shrink-0 items-center justify-between border-b border-border bg-white px-5 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open menu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ring-1 ring-border text-foreground transition-all duration-300 hover:ring-primary lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ring-1 ring-border text-secondary transition-all duration-300 hover:ring-primary hover:text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 flex h-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-medium text-white">
              3
            </span>
          </button>

          <div className="flex items-center gap-3 border-l border-border pl-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
              <p className="text-xs text-secondary">{role}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-2 ring-border shadow-md">
              {fullName.charAt(0)}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Keluar"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ring-1 ring-border text-secondary transition-all duration-300 hover:ring-error hover:text-error"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 p-5 md:p-8">
        {/* Page Title & Actions */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl mb-1">{getPageTitle()}</h1>
            <p className="text-sm text-secondary">
              Scope:{' '}
              <strong className="text-foreground">
                {canViewAll
                  ? selectedUniversity || 'Semua Universitas'
                  : universityName ?? 'Universitas belum diset'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex cursor-pointer items-center gap-2 rounded-button border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            {canExport && (
              <a
                href="#reports"
                className="flex cursor-pointer items-center gap-2 rounded-button bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-hover shadow-md shadow-primary/20"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </a>
            )}
          </div>
        </div>

        {/* Campus Filter (if Admin/Superadmin) */}
        {canViewAll && (
          <section className="mb-6 rounded-card border border-border bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="font-bold text-foreground">Filter Universitas / Kampus</h3>
                <p className="mt-1 text-sm text-secondary">
                  Filter data aset, pemanfaatan, dan laporan berdasarkan kampus terdaftar.
                </p>
              </div>
              <select
                value={selectedUniversity}
                onChange={(event) => setSelectedUniversity(event.target.value)}
                className="min-w-64 rounded-2xl border border-border bg-gray-50 px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:border-primary focus:bg-white"
              >
                <option value="">Semua Universitas</option>
                {universityOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* Dashboard Cards & Map */}
        {isDashboardPage && (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 md:mb-8">
              <SummaryCard
                icon={Landmark}
                label="Total Tanah"
                value={nf.format(liveSummary.total_land)}
                helper={`${nf.format(liveSummary.total_land_area_m2)} m² tercatat`}
              />
              <SummaryCard
                icon={Building2}
                label="Total Bangunan"
                value={nf.format(liveSummary.total_building)}
                helper={`${nf.format(liveSummary.total_building_area_m2)} m² luas bangunan`}
              />
              <SummaryCard
                icon={Handshake}
                label="Pihak Ketiga"
                value={nf.format(liveSummary.active_utilizations)}
                helper="Pemanfaatan aktif / akan berakhir"
              />
              <SummaryCard
                icon={CircleAlert}
                label="Aset Bermasalah"
                value={nf.format(liveSummary.active_issues)}
                helper="Perlu tindak lanjut"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]" id="map-section">
              <MapCard assets={displayedAssets} utilizations={scopedUtilizations} />
              <aside className="grid gap-6">
                <div className="rounded-card border border-border bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPinned className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">Legenda Status Peta</h3>
                  </div>
                  <div className="space-y-3 text-xs text-secondary">
                    <div className="flex items-center gap-2">
                      <StatusPill tone="rose">Merah</StatusPill>
                      <span>Aset bermasalah aktif</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone="amber">Oranye</StatusPill>
                      <span>Kontrak akan berakhir</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone="sky">Biru</StatusPill>
                      <span>Dimanfaatkan pihak ketiga</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone="emerald">Hijau</StatusPill>
                      <span>Terverifikasi normal</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-card border border-border bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-base font-bold text-foreground">Ringkasan Kemdiktisaintek</h3>
                  <p className="text-sm leading-relaxed text-secondary font-medium">
                    Halaman ini menampilkan peta interaktif dan indikator utama aset. Anda dapat berpindah
                    ke menu Data Aset, Pemanfaatan, atau Permasalahan melalui Sidebar di samping.
                  </p>
                </div>
              </aside>
            </section>

            {/* Admin University Charts */}
            <AdminUniversityCharts
              assets={displayedAssets}
              utilizations={scopedUtilizations}
              issues={scopedIssues}
            />
          </>
        )}

        {/* Executive Analytics */}
        {pageHash === '#analytics' && showExecutiveAnalytics && (
          <>
            <AdminUniversityCharts
              assets={displayedAssets}
              utilizations={scopedUtilizations}
              issues={scopedIssues}
            />
            <ExecutiveAnalytics
              assets={displayedAssets}
              summary={liveSummary}
              utilizations={scopedUtilizations}
              issues={scopedIssues}
            />
          </>
        )}

        {/* Asset List & Verification */}
        {['#asset-list', '#verification'].includes(pageHash) && (
          <section className="mt-6" id={pageHash === '#verification' ? 'verification' : 'asset-list'}>
            <AssetList
              key={`assets-${effectiveUniversity || 'all'}-${pageHash}`}
              assets={displayedAssets}
              currentRole={role}
              currentUniversity={universityName}
              onAssetsChange={handleAssetsChange}
            />
          </section>
        )}

        {/* Utilization Manager */}
        {pageHash === '#utilization' && (
          <section className="mt-6" id="utilization">
            <UtilizationManager
              key={`utilization-${effectiveUniversity || 'all'}`}
              assets={displayedAssets}
              utilizations={scopedUtilizations}
              canManage={canManage}
              onUtilizationsChange={handleUtilizationsChange}
            />
          </section>
        )}

        {/* Issue Manager */}
        {pageHash === '#issues' && (
          <section className="mt-6" id="issues">
            <IssueManager
              key={`issues-${effectiveUniversity || 'all'}`}
              assets={displayedAssets}
              issues={scopedIssues}
              canManage={canManage}
              onIssuesChange={handleIssuesChange}
            />
          </section>
        )}

        {/* Reports Section */}
        {pageHash === '#reports' && (
          <section
            className="mt-6 overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm"
            id="reports"
          >
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-bold text-foreground">Preview & Laporan Aset</h3>
                {!canExport && (
                  <p className="mt-1 text-xs font-semibold text-error">
                    Role {role} tidak memiliki izin ekspor data.
                  </p>
                )}
              </div>
              <button
                disabled={!canExport}
                className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-5">
                <FileText className="mb-3 h-6 w-6 text-primary" />
                <strong className="block text-sm font-bold text-foreground">Laporan Aset</strong>
                <p className="mt-1 text-xs text-secondary font-medium">Tanah, bangunan, dan status verifikasi.</p>
              </div>
              <div className="rounded-2xl bg-muted p-5">
                <Handshake className="mb-3 h-6 w-6 text-primary" />
                <strong className="block text-sm font-bold text-foreground">Laporan Pemanfaatan</strong>
                <p className="mt-1 text-xs text-secondary font-medium">Kontrak aktif dan pihak ketiga.</p>
              </div>
              <div className="rounded-2xl bg-muted p-5">
                <BadgeCheck className="mb-3 h-6 w-6 text-primary" />
                <strong className="block text-sm font-bold text-foreground">Laporan Verifikasi</strong>
                <p className="mt-1 text-xs text-secondary font-medium">Monitoring dan review data aset.</p>
              </div>
            </div>
          </section>
        )}

        {/* User Role & Approval Manager */}
        {pageHash === '#users' && canManageUserRole && (
          <UserRoleManager
            currentRole={role}
            campusOptions={universityOptions}
          />
        )}

        {/* Change Password Panel */}
        {pageHash === '#change-password' && (
          <ChangePasswordPanel visible />
        )}
      </div>
    </main>
  );
}
