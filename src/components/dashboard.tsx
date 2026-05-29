'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, Building2, CircleAlert, Download, FileText, Handshake, Landmark, Sparkles } from 'lucide-react';
import { canExportReports, canManageAssets, canManageUsers, canViewAllUniversities, canViewExecutiveAnalytics } from '@/lib/auth';
import type { Asset, AssetIssue, DashboardSummary, UserRole, Utilization } from '@/lib/types';
import { AssetList } from './asset-list';
import { ChangePasswordPanel } from './change-password-panel';
import { ExecutiveAnalytics } from './executive-analytics';
import { IssueManager } from './issue-manager';
import { MapCard } from './map-card';
import { UtilizationManager } from './utilization-manager';
import { UserRoleManager } from './user-role-manager';

const nf = new Intl.NumberFormat('id-ID');

function StatusPill({ children, tone = 'sky' }: { children: React.ReactNode; tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const tones = { sky: 'bg-sky-50 text-sky-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-600', slate: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}

function SummaryCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: LucideIcon }) {
  return <div className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Icon size={20} /></div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><h3 className="mt-2 text-4xl font-black tracking-[-.06em]">{value}</h3><p className="mt-1 text-sm text-slate-500">{helper}</p></div>;
}

export function Dashboard({ assets, summary, utilizations, issues, currentRole, fullName, universityName, onSignOut }: { assets: Asset[]; summary: DashboardSummary; utilizations: Utilization[]; issues: AssetIssue[]; currentRole: UserRole; fullName: string; universityName: string | null; onSignOut: () => void }) {
  const role = currentRole;
  const canViewAll = canViewAllUniversities(role);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [currentAssets, setCurrentAssets] = useState(assets);
  const [currentUtilizations, setCurrentUtilizations] = useState(utilizations);
  const [currentIssues, setCurrentIssues] = useState(issues);
  const universityOptions = useMemo(() => Array.from(new Set(currentAssets.map((asset) => asset.campus_name).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, 'id-ID')), [currentAssets]);
  const effectiveUniversity = canViewAll ? selectedUniversity : universityName ?? '';
  const scopedAssets = useMemo(() => effectiveUniversity ? currentAssets.filter((asset) => asset.campus_name === effectiveUniversity) : currentAssets, [currentAssets, effectiveUniversity]);
  const scopedAssetIds = useMemo(() => new Set(scopedAssets.map((asset) => asset.id)), [scopedAssets]);
  const scopedUtilizations = useMemo(() => currentUtilizations.filter((item) => scopedAssetIds.has(item.asset_id)), [currentUtilizations, scopedAssetIds]);
  const scopedIssues = useMemo(() => currentIssues.filter((issue) => scopedAssetIds.has(issue.asset_id)), [currentIssues, scopedAssetIds]);
  const displayedAssets = useMemo(() => scopedAssets.map((asset) => ({
    ...asset,
    has_active_issue: scopedIssues.some((issue) => issue.asset_id === asset.id && issue.status !== 'selesai'),
    has_active_utilization: scopedUtilizations.some((item) => item.asset_id === asset.id && ['aktif', 'akan_berakhir'].includes(item.status)),
  })), [scopedAssets, scopedIssues, scopedUtilizations]);
  const liveSummary = useMemo<DashboardSummary>(() => ({
    ...summary,
    total_land: displayedAssets.filter((asset) => asset.asset_type === 'land').length,
    total_building: displayedAssets.filter((asset) => asset.asset_type === 'building').length,
    verified_assets: displayedAssets.filter((asset) => asset.verification_status === 'terverifikasi').length,
    pending_verification: displayedAssets.filter((asset) => asset.verification_status === 'menunggu_verifikasi').length,
    active_issues: scopedIssues.filter((issue) => issue.status !== 'selesai').length,
    active_utilizations: scopedUtilizations.filter((item) => ['aktif', 'akan_berakhir'].includes(item.status)).length,
  }), [displayedAssets, scopedIssues, scopedUtilizations, summary]);
  const attentionAssets = displayedAssets.filter((asset) => asset.has_active_issue || asset.has_active_utilization || asset.verification_status === 'menunggu_verifikasi');
  const canManage = canManageAssets(role);
  const showExecutiveAnalytics = canViewExecutiveAnalytics(role);
  const canExport = canExportReports(role);
  const canManageUserRole = canManageUsers(role);
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (!['#utilization', '#issues'].includes(activeHash)) return;
    requestAnimationFrame(() => document.querySelector(activeHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [activeHash]);

  function handleAssetsChange(nextAssets: Asset[]) {
    const nextAssetIds = new Set(nextAssets.map((asset) => asset.id));
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentAssets((current) => effectiveUniversity ? [...current.filter((asset) => asset.campus_name !== effectiveUniversity), ...nextAssets] : nextAssets);
    setCurrentIssues((current) => current.filter((issue) => effectiveUniversity && !scopedIds.has(issue.asset_id) ? true : nextAssetIds.has(issue.asset_id)));
  }

  function handleUtilizationsChange(nextUtilizations: Utilization[]) {
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentUtilizations((current) => effectiveUniversity ? [...current.filter((item) => !scopedIds.has(item.asset_id)), ...nextUtilizations] : nextUtilizations);
  }

  function handleIssuesChange(nextIssues: AssetIssue[]) {
    const scopedIds = new Set(scopedAssets.map((asset) => asset.id));
    setCurrentIssues((current) => effectiveUniversity ? [...current.filter((issue) => !scopedIds.has(issue.asset_id)), ...nextIssues] : nextIssues);
  }

  return (
    <main className="px-4 pb-28 pt-5 sm:px-6 lg:p-6">
      <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" id="dashboard">
        <div><p className="mb-2 inline-flex rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-black text-sky-700 shadow-sm backdrop-blur"><Sparkles className="mr-2 h-4 w-4" /> Luxury Asset Intelligence</p><h2 className="text-2xl font-black tracking-[-.04em] text-slate-950 sm:text-3xl">Dashboard Aset Universitas</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Next.js serverless dashboard untuk monitoring tanah, bangunan, pemanfaatan, dan permasalahan aset.</p></div>
        <div className="flex flex-col gap-2 sm:items-end"><div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm backdrop-blur"><span className="grid h-8 w-8 place-items-center rounded-full border border-sky-100 bg-gradient-to-br from-sky-50 to-white text-sky-700">A</span>{fullName} • {role}</div><div className="w-fit rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">Scope: {canViewAll ? (selectedUniversity || 'Semua Universitas') : universityName ?? 'Universitas belum diset'}</div><button type="button" onClick={onSignOut} className="w-fit rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-black text-slate-500 shadow-sm">Keluar</button></div>
      </section>

      {canViewAll && (
        <section className="mb-5 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-black text-slate-950">Filter Universitas</h3><p className="mt-1 text-sm text-slate-500">Daftar aset, pemanfaatan, dan permasalahan mengikuti filter ini agar data tidak terlalu ramai.</p></div>
            <select value={selectedUniversity} onChange={(event) => setSelectedUniversity(event.target.value)} className="min-w-72 rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              <option value="">Semua Universitas</option>
              {universityOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </section>
      )}

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Landmark} label="Total Tanah" value={nf.format(liveSummary.total_land)} helper={`${nf.format(liveSummary.total_land_area_m2)} m² tercatat`} />
        <SummaryCard icon={Building2} label="Total Bangunan" value={nf.format(liveSummary.total_building)} helper={`${nf.format(liveSummary.total_building_area_m2)} m² luas bangunan`} />
        <SummaryCard icon={Handshake} label="Pihak Ketiga" value={nf.format(liveSummary.active_utilizations)} helper="Pemanfaatan aktif/akan berakhir" />
        <SummaryCard icon={CircleAlert} label="Aset Bermasalah" value={nf.format(liveSummary.active_issues)} helper="Perlu tindak lanjut" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]"><MapCard assets={displayedAssets} utilizations={scopedUtilizations} /><aside className="grid gap-5"><div className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl"><h3 className="mb-4 text-lg font-black">Aset Perlu Perhatian</h3><div className="grid gap-3">{attentionAssets.map((asset) => <div key={asset.id} className="rounded-2xl border border-sky-100 bg-white/70 p-4 shadow-sm"><h4 className="font-black">{asset.asset_name}</h4><p className="mt-1 text-sm text-slate-500">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'} • {asset.campus_name}</p><div className="mt-3 flex flex-wrap gap-2">{asset.has_active_issue && <StatusPill tone="rose">Bermasalah</StatusPill>}{asset.has_active_utilization && <StatusPill tone="sky">Pemanfaatan aktif</StatusPill>}{asset.verification_status === 'menunggu_verifikasi' && <StatusPill tone="slate">Menunggu verifikasi</StatusPill>}</div></div>)}</div></div><div className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl"><h3 className="mb-4 text-lg font-black">Legenda Status Peta</h3><div className="space-y-3 text-sm text-slate-600"><div className="flex flex-wrap items-center gap-2"><StatusPill tone="rose">Merah</StatusPill><span>Aset bermasalah aktif</span></div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="amber">Oranye</StatusPill><span>Kontrak akan berakhir</span></div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="sky">Biru</StatusPill><span>Dimanfaatkan pihak ketiga</span></div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="emerald">Hijau</StatusPill><span>Terverifikasi normal</span></div></div></div></aside></section>

      {showExecutiveAnalytics && <ExecutiveAnalytics assets={displayedAssets} summary={liveSummary} utilizations={scopedUtilizations} issues={scopedIssues} />}

      <AssetList key={`assets-${effectiveUniversity || 'all'}`} assets={displayedAssets} currentRole={role} currentUniversity={universityName} onAssetsChange={handleAssetsChange} />

      {activeHash === '#utilization' && <section className="mt-5"><UtilizationManager key={`utilization-${effectiveUniversity || 'all'}`} assets={displayedAssets} utilizations={scopedUtilizations} canManage={canManage} onUtilizationsChange={handleUtilizationsChange} /></section>}

      {activeHash === '#issues' && <section className="mt-5"><IssueManager key={`issues-${effectiveUniversity || 'all'}`} assets={displayedAssets} issues={scopedIssues} canManage={canManage} onIssuesChange={handleIssuesChange} /></section>}

      <section className="mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="reports"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-black">Preview Laporan</h3>{!canExport && <p className="mt-1 text-xs font-black text-amber-600">Role {role} tidak memiliki izin export data.</p>}</div><button disabled={!canExport} className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-black text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Download className="h-4 w-4" />Export Excel</button></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-sky-50 p-4"><FileText className="mb-3 text-sky-700" /><strong>Laporan Aset</strong><p className="mt-1 text-sm text-slate-500">Tanah, bangunan, status verifikasi.</p></div><div className="rounded-2xl bg-sky-50 p-4"><Handshake className="mb-3 text-sky-700" /><strong>Laporan Pemanfaatan</strong><p className="mt-1 text-sm text-slate-500">Kontrak aktif dan akan berakhir.</p></div><div className="rounded-2xl bg-sky-50 p-4"><BadgeCheck className="mb-3 text-sky-700" /><strong>Laporan Verifikasi</strong><p className="mt-1 text-sm text-slate-500">Monitoring review data aset.</p></div></div></section>

      {canManageUserRole ? <UserRoleManager currentRole={role} campusOptions={universityOptions} /> : <ChangePasswordPanel visible />}
    </main>
  );
}
