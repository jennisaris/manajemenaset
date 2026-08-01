'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileText,
  Handshake,
  Landmark,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  canExportReports,
  canManageAssets,
  canManageUsers,
  canViewAllUniversities,
  canViewExecutiveAnalytics,
} from '@/lib/auth';
import type { Asset, AssetIssue, BmnDisposalProposal, DashboardSummary, UserProfile, UserRole, Utilization } from '@/lib/types';
import { AssetList } from './asset-list';
import { ChangePasswordPanel } from './change-password-panel';
import { ExecutiveAnalytics } from './executive-analytics';
import { AdminUniversityCharts } from './admin-university-charts';
import { IssueManager } from './issue-manager';
import { MapCard } from './map-card';
import { UtilizationManager } from './utilization-manager';
import { UserRoleManager } from './user-role-manager';
import { BmnManager } from './bmn/bmn-manager';
import { matchesUniversityScope } from '@/lib/satker-utils';
import { BmnDisposalManager } from './bmn-disposal-manager';
import { VerificationCenter } from './verification-center';
import { BulkAssetUploader } from './bulk-asset-uploader';
import { ReportsManager } from './reports-manager';

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

  const [activeHash, setActiveHash] = useState('');
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [pendingDisposals, setPendingDisposals] = useState<BmnDisposalProposal[]>([]);
  const [allDisposals, setAllDisposals] = useState<BmnDisposalProposal[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const scopedAssets = useMemo(
    () =>
      effectiveUniversity
        ? currentAssets.filter((asset) => matchesUniversityScope(asset, effectiveUniversity))
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

  const executiveMetrics = useMemo(() => {
    const totalAssets = displayedAssets.length;
    const mappedCount = displayedAssets.filter(
      (a) => (a.latitude !== null && a.longitude !== null) || Boolean(a.geometry_geojson)
    ).length;
    const mappedPct = totalAssets > 0 ? Math.round((mappedCount / totalAssets) * 100) : 0;

    const certifiedCount = displayedAssets.filter((a) => {
      const statusStr = typeof a.status_sertifikasi === 'string' ? a.status_sertifikasi.toLowerCase() : typeof (a as any).certification_status === 'string' ? (a as any).certification_status.toLowerCase() : '';
      return ['sertifikat', 'sudah sertifikat', 'hak pakai', 'hak milik', 'bpkb'].some((keyword) =>
        statusStr.includes(keyword)
      );
    }).length;
    const certifiedPct = totalAssets > 0 ? Math.round((certifiedCount / totalAssets) * 100) : 0;

    const activeUtilCount = scopedUtilizations.filter((u) => typeof u.status === 'string' && ['aktif', 'akan_berakhir'].includes(u.status.toLowerCase())).length;
    const activeIssueCount = scopedIssues.filter((i) => typeof i.status === 'string' && ['open', 'in_progress'].includes(i.status.toLowerCase())).length;

    return {
      totalAssets,
      mappedCount,
      mappedPct,
      certifiedCount,
      certifiedPct,
      activeUtilCount,
      activeIssueCount,
    };
  }, [displayedAssets, scopedUtilizations, scopedIssues]);

  const executiveSummaryData = useMemo(() => {
    const totalAssetCount = displayedAssets.length;
    const totalNilaiPerolehan = displayedAssets.reduce((sum, a) => sum + (Number(a.nilai_perolehan) || 0), 0);
    const totalLandArea = liveSummary.total_land_area_m2;
    const totalBuildingArea = liveSummary.total_building_area_m2;

    const activeUtilCount = scopedUtilizations.filter((u) => typeof u.status === 'string' && ['aktif', 'akan_berakhir'].includes(u.status.toLowerCase())).length;
    const totalNilaiPnbp = scopedUtilizations.reduce((sum, u) => sum + (Number((u as any).nilai_sewa) || 0), 0);

    const activeIssueCount = scopedIssues.filter((i) => typeof i.status === 'string' && i.status.toLowerCase() !== 'selesai').length;
    const sengketaCount = scopedIssues.filter((i) => i.issue_type === 'sengketa' || (typeof i.issue_title === 'string' && i.issue_title.toLowerCase().includes('sengketa'))).length;

    const pendingDisposalCount = pendingDisposals.length;
    const approvedDisposalCount = pendingDisposals.filter((d) => d.status === 'disetujui').length;

    return {
      totalAssetCount,
      totalNilaiPerolehan,
      totalLandArea,
      totalBuildingArea,
      activeUtilCount,
      totalNilaiPnbp,
      activeIssueCount,
      sengketaCount,
      pendingDisposalCount,
      approvedDisposalCount,
    };
  }, [displayedAssets, liveSummary, scopedUtilizations, scopedIssues, pendingDisposals]);

  const canManage = canManageAssets(role);
  const showExecutiveAnalytics = canViewExecutiveAnalytics(role);
  const canExport = canExportReports(role);
  const canManageUserRole = canManageUsers(role);

  useEffect(() => {
    async function fetchNotifs() {
      try {
        if (canManageUserRole) {
          const userRes = await fetch('/api/admin/users?status=pending');
          if (userRes.ok) {
            const userData = await userRes.json();
            setPendingUsers(userData.users || []);
          }
        }
        const dispRes = await fetch('/api/disposals');
        if (dispRes.ok) {
          const dispData = await dispRes.json();
          const proposals = dispData.proposals || [];
          setAllDisposals(proposals);
          const pendingList = proposals.filter((item: BmnDisposalProposal) => item.status === 'menunggu_verifikasi');
          setPendingDisposals(pendingList);
        }
      } catch (err) {
        console.error('Gagal mengambil data notifikasi:', err);
      }
    }
    fetchNotifs();
  }, [canManageUserRole]);

  const totalNotifCount = pendingUsers.length + pendingDisposals.length;

  const handleRefreshAssets = async () => {
    try {
      const res = await fetch('/api/mvp-data');
      if (res.ok) {
        const json = await res.json();
        if (json.assets) {
          setCurrentAssets(json.assets);
        }
      }
    } catch (err) {
      console.error('Gagal menyegarkan data aset:', err);
    }
  };

  const pageHash = activeHash || '#dashboard';
  const isDashboardPage = ['#dashboard', '#analytics', ''].includes(pageHash);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleSelectAssetFromMap = (asset: Asset) => {
    setSelectedAssetForDetail(asset);
    window.location.hash = '#asset-list';
  };

  const getPageTitle = () => {
    switch (pageHash) {
      case '#dashboard':
        return role === 'Pimpinan Dashboard' ? 'Analitik Eksekutif Kemdiktisaintek' : 'Kemdiktisaintek Dashboard';
      case '#asset-list':
      case '#asset-bangunan-tanah':
        return 'Data Aset - Bangunan / Tanah';
      case '#asset-alat-angkutan':
        return 'Data Aset - Alat Angkut Bermotor';
      case '#asset-khusus-tik':
        return 'Data Aset - Mesin Khusus TIK';
      case '#asset-non-tik':
        return 'Data Aset - Mesin Peralatan Non TIK';
      case '#verification':
        return 'Verifikasi Aset';
      case '#upload':
        return 'Unggah Data Aset Massal';
      case '#utilization':
        return 'Pemanfaatan Aset';
      case '#disposal':
        return 'Penghapusan BMN';
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ring-1 transition-all duration-300 ${isNotifOpen
                  ? 'ring-primary text-primary bg-sky-50'
                  : 'ring-border text-secondary hover:ring-primary hover:text-primary'
                }`}
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6" />
              {totalNotifCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-black text-white shadow-md shadow-rose-500/30 animate-pulse">
                  {totalNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">Pemberitahuan Sistem</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{totalNotifCount} usulan & persetujuan butuh tindakan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {/* Notification 1: Pending Users */}
                  {canManageUserRole && (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                          <UserCheck className="h-4 w-4 text-sky-600" /> Approval User Baru
                        </span>
                        <span className="rounded-full bg-sky-200/80 px-2 py-0.5 text-[10px] font-black text-sky-800">
                          {pendingUsers.length} User
                        </span>
                      </div>
                      {pendingUsers.length > 0 ? (
                        <>
                          <p className="text-xs text-slate-600 font-medium leading-snug">
                            Ada {pendingUsers.length} pendaftaran user dari Satker yang menunggu persetujuan Admin.
                          </p>
                          <a
                            href="#users"
                            onClick={() => {
                              window.location.hash = '#users';
                              setIsNotifOpen(false);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#165DFF] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-600 transition"
                          >
                            Proses User di Menu Users →
                          </a>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium">Tidak ada registrasi user baru yang menunggu.</p>
                      )}
                    </div>
                  )}

                  {/* Notification 2: Pending Disposal Proposals */}
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <FileSpreadsheet className="h-4 w-4 text-amber-600" /> Usulan Penghapusan Satker
                      </span>
                      <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        {pendingDisposals.length} Usulan
                      </span>
                    </div>
                    {pendingDisposals.length > 0 ? (
                      <>
                        <p className="text-xs text-slate-600 font-medium leading-snug">
                          Ada {pendingDisposals.length} usulan penghapusan BMN baru dari Satker yang perlu diproses.
                        </p>
                        <div className="space-y-1">
                          {pendingDisposals.slice(0, 3).map((disp) => (
                            <div key={disp.id} className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-amber-200/60 font-semibold truncate">
                              📄 {disp.no_surat_permohonan} ({disp.nama_satker})
                            </div>
                          ))}
                        </div>
                        <a
                          href="#disposal"
                          onClick={() => {
                            window.location.hash = '#disposal';
                            setIsNotifOpen(false);
                          }}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition mt-1"
                        >
                          Proses di Menu Penghapusan →
                        </a>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-medium">Belum ada usulan penghapusan BMN yang menunggu.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-border pl-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-foreground">{fullName.replace(/^Operator\s+/i, '') || fullName}</p>
              <p className="text-xs text-secondary">{role}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-2 ring-border shadow-md">
              {(fullName.replace(/^Operator\s+/i, '') || fullName).charAt(0)}
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
            {/* Executive Summary Top Cards (Aset, Pemanfaatan, Permasalahan, Penghapusan) */}
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 md:mb-8">
              {/* Card 1: Summary Aset */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Aset BMN</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Landmark className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-[#080C1A]">
                    {nf.format(executiveSummaryData.totalAssetCount)} <span className="text-xs font-bold text-slate-400">Unit</span>
                  </div>
                  <p className="mt-0.5 text-xs font-extrabold text-emerald-700">
                    Rp {nf.format(executiveSummaryData.totalNilaiPerolehan)}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
                    <span>🗺️ {nf.format(executiveSummaryData.totalLandArea)} m² Tanah</span>
                    <span>🏢 {nf.format(executiveSummaryData.totalBuildingArea)} m² Bangunan</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Summary Pemanfaatan */}
              <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-sky-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pemanfaatan Aset</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-[#165DFF] border border-sky-100">
                    <Handshake className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-[#080C1A]">
                    {nf.format(executiveSummaryData.activeUtilCount)} <span className="text-xs font-bold text-slate-400">Kerjasama</span>
                  </div>
                  <p className="mt-0.5 text-xs font-extrabold text-[#165DFF]">
                    Est. PNBP: Rp {nf.format(executiveSummaryData.totalNilaiPnbp)}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
                    <span>🤝 Pihak Ketiga</span>
                    <span className="text-sky-700 font-bold">Sewa / KSP / BSG</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Summary Permasalahan */}
              <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-rose-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Permasalahan & Sengketa</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                    <CircleAlert className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-[#080C1A]">
                    {nf.format(executiveSummaryData.activeIssueCount)} <span className="text-xs font-bold text-slate-400">Kasus Aktif</span>
                  </div>
                  <p className="mt-0.5 text-xs font-extrabold text-rose-600">
                    {executiveSummaryData.sengketaCount} Sengketa Legal
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
                    <span>⚠️ Open / In Progress</span>
                    <span className="text-rose-700 font-bold">Tindak Lanjut</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Summary Penghapusan */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usulan Penghapusan</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                    <Archive className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-[#080C1A]">
                    {nf.format(executiveSummaryData.pendingDisposalCount)} <span className="text-xs font-bold text-slate-400">Usulan Satker</span>
                  </div>
                  <p className="mt-0.5 text-xs font-extrabold text-amber-700">
                    {executiveSummaryData.approvedDisposalCount} Disetujui (SK Terbit)
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
                    <span>📑 5 Berkas syarat</span>
                    <span className="text-amber-700 font-bold">Penelitian BMN</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]" id="map-section">
              <MapCard assets={displayedAssets} utilizations={scopedUtilizations} onSelectAsset={handleSelectAssetFromMap} />
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

                {/* Dynamic Executive Summary Card */}
                <div className="rounded-card border border-border bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-[#165DFF]">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-foreground">Portofolio Kemdiktisaintek</h3>
                        <p className="text-[11px] text-secondary font-medium">Ringkasan Kesehatan Aset PTN & Satker</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                      Live 2026
                    </span>
                  </div>

                  {/* 2x2 Metric Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Metric 1: Mapped GIS */}
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">📍 Terpetakan GIS</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#165DFF]">{executiveMetrics.mappedPct}%</span>
                        <span className="text-[10px] text-secondary font-semibold">({executiveMetrics.mappedCount}/{executiveMetrics.totalAssets})</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-sky-200/60 overflow-hidden mt-1">
                        <div className="h-full bg-[#165DFF] rounded-full transition-all duration-500" style={{ width: `${executiveMetrics.mappedPct}%` }} />
                      </div>
                    </div>

                    {/* Metric 2: Legal Certification */}
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">📜 Sertifikasi Legal</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-emerald-600">{executiveMetrics.certifiedPct}%</span>
                        <span className="text-[10px] text-secondary font-semibold">({executiveMetrics.certifiedCount} Unit)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-emerald-200/60 overflow-hidden mt-1">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${executiveMetrics.certifiedPct}%` }} />
                      </div>
                    </div>

                    {/* Metric 3: Active Utilization */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">🤝 Pemanfaatan Aktif</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-indigo-600">{executiveMetrics.activeUtilCount}</span>
                        <span className="text-[10px] text-secondary font-semibold">Kerjasama</span>
                      </div>
                      <p className="text-[10px] text-indigo-700 font-medium truncate">PNBP Mitra Aktif</p>
                    </div>

                    {/* Metric 4: Risk / Active Issues */}
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">⚠️ Isu & Risiko</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-rose-600">{executiveMetrics.activeIssueCount}</span>
                        <span className="text-[10px] text-secondary font-semibold">Perlu Tindakan</span>
                      </div>
                      <p className="text-[10px] text-rose-700 font-medium truncate">Sengketa / Kerusakan</p>
                    </div>
                  </div>

                  {/* Insight Callout */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Sparkles className="h-4 w-4 text-[#165DFF] shrink-0" />
                    <span>
                      {executiveMetrics.mappedPct >= 80
                        ? 'Mayoritas aset telah terintegrasi peta GIS dengan tingkat legalitas baik.'
                        : 'Perlu peningkatan pemetaan koordinat GIS untuk aset perguruan tinggi.'}
                    </span>
                  </div>
                </div>
              </aside>
            </section>

            {/* Admin University Charts */}
            <AdminUniversityCharts
              assets={displayedAssets}
              utilizations={scopedUtilizations}
              issues={scopedIssues}
            />

            {/* Executive Analytics (Grafik Data Aset & Grafik Usulan Penghapusan) */}
            <ExecutiveAnalytics
              assets={displayedAssets}
              summary={liveSummary}
              utilizations={scopedUtilizations}
              issues={scopedIssues}
              disposals={allDisposals}
            />
          </>
        )}

        {/* Sub-Menu 1: Bangunan / Tanah */}
        {['#asset-list', '#asset-bangunan-tanah'].includes(pageHash) && (
          <section className="mt-6" id="asset-list">
            <AssetList
              key={`assets-${effectiveUniversity || 'all'}-${pageHash}`}
              assets={displayedAssets}
              currentRole={role}
              currentUniversity={universityName}
              onAssetsChange={handleAssetsChange}
              initialViewingAsset={selectedAssetForDetail}
              onCloseDetail={() => setSelectedAssetForDetail(null)}
            />
          </section>
        )}

        {/* Centralized Verification Center (Khusus Superadmin) */}
        {pageHash === '#verification' && role === 'Superadmin' && (
          <section className="mt-6" id="verification">
            <VerificationCenter
              key={`verification-${effectiveUniversity || 'all'}`}
              assets={displayedAssets}
              currentRole={role}
              currentUniversity={universityName}
              onAssetsChange={handleAssetsChange}
              onStatusChanged={handleRefreshAssets}
            />
          </section>
        )}

        {/* Bulk Asset Uploader */}
        {pageHash === '#upload' && (
          <section className="mt-6" id="upload">
            <BulkAssetUploader
              userRole={role}
              universityName={universityName}
              onUploadSuccess={handleRefreshAssets}
            />
          </section>
        )}

        {/* Sub-Menu 2: Alat Angkut Bermotor */}
        {pageHash === '#asset-alat-angkutan' && (
          <section className="mt-6">
            <BmnManager
              category="alat_angkutan"
              categoryTitle="Data Aset - Alat Angkut Bermotor"
              defaultJenisBmn="ALAT ANGKUTAN BERMOTOR"
              isOperator={role === 'Operator Kampus'}
            />
          </section>
        )}

        {/* Sub-Menu 3: Mesin Khusus TIK */}
        {pageHash === '#asset-khusus-tik' && (
          <section className="mt-6">
            <BmnManager
              category="khusus_tik"
              categoryTitle="Data Aset - Mesin Khusus TIK"
              defaultJenisBmn="MESIN PERALATAN KHUSUS TIK"
              isOperator={role === 'Operator Kampus'}
            />
          </section>
        )}

        {/* Sub-Menu 4: Mesin Peralatan Non TIK */}
        {pageHash === '#asset-non-tik' && (
          <section className="mt-6">
            <BmnManager
              category="non_tik"
              categoryTitle="Data Aset - Mesin Peralatan Non TIK"
              defaultJenisBmn="MESIN PERALATAN NON TIK"
              isOperator={role === 'Operator Kampus'}
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

        {/* BMN Disposal Manager */}
        {pageHash === '#disposal' && (
          <section className="mt-6" id="disposal">
            <BmnDisposalManager
              currentRole={role}
              universityName={universityName}
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
          <ReportsManager
            assets={currentAssets}
            utilizations={currentUtilizations}
            issues={currentIssues}
            currentRole={role}
            universityOptions={universityOptions}
            universityName={universityName}
          />
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
