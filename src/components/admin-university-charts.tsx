'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Filter, Handshake, School, Search, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Asset, AssetIssue, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';

function getNormalizedUniversityKey(asset: { campus_name?: string | null; nama_satker?: string | null; kode_satker?: string | null }): string {
  const code6 = extract6DigitKodeSatker(asset.kode_satker);
  let rawName = (asset.nama_satker || asset.campus_name || 'Kampus Utama').trim();

  rawName = rawName.replace(/^\[\d{6}\]\s*/, '').replace(/^\d{6}\s*-\s*/, '').trim();

  if (code6 && rawName) {
    return `[${code6}] ${rawName}`;
  }
  if (code6) return `[${code6}]`;
  return rawName || 'Kampus Utama';
}

const colors = {
  emerald: '#10b981',
  emeraldDark: '#047857',
  sky: '#0284c7',
  rose: '#e11d48',
  amber: '#f59e0b',
  slate: '#64748b',
};

function getIssueStageProgress(status: string): { percentage: number; label: string } {
  const normalized = (status || '').toLowerCase().trim();
  if (normalized === 'selesai') {
    return { percentage: 100, label: '100% Selesai' };
  }
  if (normalized === 'sedang_ditindaklanjuti' || normalized === 'tindak_lanjut') {
    return { percentage: 75, label: '75% Ditindaklanjuti' };
  }
  if (normalized === 'investigasi' || normalized === 'dalam_proses' || normalized === 'proses_penanganan') {
    return { percentage: 50, label: '50% Penanganan' };
  }
  return { percentage: 25, label: '25% Dicatat' };
}

function getStageLabelFromPercentage(pct: number): string {
  if (pct >= 90) return '100% Selesai';
  if (pct >= 60) return '75% Ditindaklanjuti';
  if (pct >= 35) return '50% Penanganan';
  return '25% Dicatat';
}

type UniversityUtilizationData = {
  rank: number;
  rankLabel: string;
  university: string;
  utilizedLandCount: number;
  utilizedAreaM2: number;
  totalAssets: number;
};

type UniversityIssueData = {
  rank: number;
  rankLabel: string;
  university: string;
  normalAssets: number;
  problematicAssets: number;
  totalAssets: number;
  problemPercentage: number;
  healthPercentage: number;
  totalIssues: number;
  resolvedIssues: number;
  resolutionPercentage: number;
  latestStageLabel: string;
};

export function AdminUniversityCharts({
  assets,
  utilizations,
  issues,
}: {
  assets: Asset[];
  utilizations: Utilization[];
  issues: AssetIssue[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number | 'all'>(5);

  // 1. Data Pemanfaatan Lahan per Universitas
  const allUtilizationData = useMemo<UniversityUtilizationData[]>(() => {
    const assetById = new Map(assets.map((a) => [a.id, a]));
    const activeUtilizations = utilizations.filter((u) => ['aktif', 'akan_berakhir'].includes(u.status));

    const uniMap = new Map<string, { count: number; area: number; totalAssets: number }>();

    for (const asset of assets) {
      const uni = getNormalizedUniversityKey(asset);
      if (!uniMap.has(uni)) {
        uniMap.set(uni, { count: 0, area: 0, totalAssets: 0 });
      }
      uniMap.get(uni)!.totalAssets += 1;
    }

    for (const util of activeUtilizations) {
      const asset = assetById.get(util.asset_id);
      if (!asset) continue;
      const uni = getNormalizedUniversityKey(asset);
      const record = uniMap.get(uni);
      if (record) {
        record.count += 1;
        record.area += Number(util.utilized_area_m2 || 0);
      }
    }

    return Array.from(uniMap.entries())
      .map(([university, data]) => ({
        university,
        utilizedLandCount: data.count,
        utilizedAreaM2: data.area,
        totalAssets: data.totalAssets,
      }))
      .sort((a, b) => b.utilizedLandCount - a.utilizedLandCount || b.utilizedAreaM2 - a.utilizedAreaM2)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        rankLabel: `#${index + 1}`,
      }));
  }, [assets, utilizations]);

  // Filtered & Sliced Utilization Data
  const filteredUtilizationData = useMemo(() => {
    let result = allUtilizationData;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.university.toLowerCase().includes(query));
    }
    if (displayLimit !== 'all') {
      result = result.slice(0, displayLimit);
    }
    return result;
  }, [allUtilizationData, searchQuery, displayLimit]);

  // 2. Data Aset Bermasalah vs Tidak Bermasalah per Universitas (dengan Persentase Progress Stage)
  const allIssueData = useMemo<UniversityIssueData[]>(() => {
    const unresolvedIssues = issues.filter((i) => i.status !== 'selesai');
    const problematicAssetIds = new Set(unresolvedIssues.map((i) => i.asset_id));
    const assetById = new Map(assets.map((a) => [a.id, a]));

    const uniMap = new Map<string, { normal: number; problematic: number; totalIssues: number; resolvedIssues: number; totalStagePoints: number }>();

    for (const asset of assets) {
      const uni = getNormalizedUniversityKey(asset);
      if (!uniMap.has(uni)) {
        uniMap.set(uni, { normal: 0, problematic: 0, totalIssues: 0, resolvedIssues: 0, totalStagePoints: 0 });
      }
      const record = uniMap.get(uni)!;
      if (problematicAssetIds.has(asset.id) || asset.has_active_issue) {
        record.problematic += 1;
      } else {
        record.normal += 1;
      }
    }

    for (const issue of issues) {
      const asset = assetById.get(issue.asset_id);
      if (!asset) continue;
      const uni = getNormalizedUniversityKey(asset);
      const record = uniMap.get(uni);
      if (record) {
        record.totalIssues += 1;
        const stage = getIssueStageProgress(issue.status);
        record.totalStagePoints += stage.percentage;
        if (issue.status === 'selesai') {
          record.resolvedIssues += 1;
        }
      }
    }

    return Array.from(uniMap.entries())
      .map(([university, data]) => {
        const total = data.normal + data.problematic;
        const problemPercentage = total > 0 ? Math.round((data.problematic / total) * 100) : 0;
        const healthPercentage = total > 0 ? Math.round((data.normal / total) * 100) : 100;
        const resolutionPercentage = data.totalIssues > 0 ? Math.round(data.totalStagePoints / data.totalIssues) : 100;
        const latestStageLabel = data.totalIssues > 0 ? getStageLabelFromPercentage(resolutionPercentage) : '100% Selesai';

        return {
          university,
          normalAssets: data.normal,
          problematicAssets: data.problematic,
          totalAssets: total,
          problemPercentage,
          healthPercentage,
          totalIssues: data.totalIssues,
          resolvedIssues: data.resolvedIssues,
          resolutionPercentage,
          latestStageLabel,
        };
      })
      .sort((a, b) => b.problematicAssets - a.problematicAssets || b.totalAssets - a.totalAssets)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        rankLabel: `#${index + 1}`,
      }));
  }, [assets, issues]);

  // Filtered & Sliced Issue Data
  const filteredIssueData = useMemo(() => {
    let result = allIssueData;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.university.toLowerCase().includes(query));
    }
    if (displayLimit !== 'all') {
      result = result.slice(0, displayLimit);
    }
    return result;
  }, [allIssueData, searchQuery, displayLimit]);

  // Total summary stats
  const totalUtilizedCount = useMemo(
    () => allUtilizationData.reduce((acc, curr) => acc + curr.utilizedLandCount, 0),
    [allUtilizationData]
  );
  const totalUtilizedArea = useMemo(
    () => allUtilizationData.reduce((acc, curr) => acc + curr.utilizedAreaM2, 0),
    [allUtilizationData]
  );
  const totalProblematicAssets = useMemo(
    () => allIssueData.reduce((acc, curr) => acc + curr.problematicAssets, 0),
    [allIssueData]
  );
  const totalNormalAssets = useMemo(
    () => allIssueData.reduce((acc, curr) => acc + curr.normalAssets, 0),
    [allIssueData]
  );

  return (
    <section className="mt-8 space-y-6" id="admin-university-analytics">
      {/* Header Title */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3.5 py-1 text-xs font-extrabold text-sky-700 border border-sky-200 shadow-xs mb-2">
            <School className="h-4 w-4 text-sky-600" /> Executive & Admin Dashboard Analytics
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Grafik Pemanfaatan dan Permasalahan Aset
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Grafik komparatif pemanfaatan lahan dan permasalahan aset. Gunakan filter jumlah data dan pencarian kampus di bawah.
          </p>
        </div>

        {/* Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3.5 py-2 text-emerald-800 border border-emerald-200 shadow-xs">
            <Handshake className="h-4 w-4 text-emerald-600" />
            {totalUtilizedCount} Lahan Dimanfaatkan ({formatArea(totalUtilizedArea)})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-50 px-3.5 py-2 text-rose-800 border border-rose-200 shadow-xs">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            {totalProblematicAssets} Aset Bermasalah ({totalNormalAssets} Normal)
          </span>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Limit Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari perguruan tinggi / universitas..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Display Limit Dropdown Selector */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="h-4 w-4 text-sky-600" />
          <span>Tampilkan:</span>
          <select
            value={displayLimit}
            onChange={(e) => {
              const val = e.target.value;
              setDisplayLimit(val === 'all' ? 'all' : Number(val));
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white cursor-pointer"
          >
            <option value={5}>5 Data (Default)</option>
            <option value={10}>10 Data</option>
            <option value={20}>20 Data</option>
            <option value={50}>50 Data</option>
            <option value="all">Semua Data Kampus</option>
          </select>
        </div>
      </div>

      {/* Grid Charts Container */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* CHART 1: Pemanfaatan Lahan per Universitas */}
        <div className="flex flex-col rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
                  <Handshake className="h-4 w-4" />
                </span>
                <h3 className="text-base font-black text-slate-900">1. Pemanfaatan Lahan per Universitas</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                Grafik pemanfaatan lahan dengan tabel rincian data perguruan tinggi di bawah.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              {filteredUtilizationData.length} Kampus Tampil
            </span>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredUtilizationData}
                margin={{ top: 12, right: 16, left: -10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis hide />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                  label={{ value: 'Jumlah Lahan', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as UniversityUtilizationData;
                      return (
                        <div className="rounded-2xl border border-emerald-100 bg-slate-900 p-3.5 shadow-xl text-white text-xs space-y-1 z-50 min-w-56">
                          <span className="inline-block rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-slate-950 mb-1">
                            Nomor Urut {data.rankLabel}
                          </span>
                          <strong className="block font-bold text-emerald-300 text-sm">{data.university}</strong>
                          <p className="text-slate-300 pt-1">
                            Lahan Dimanfaatkan: <strong className="text-white font-bold">{data.utilizedLandCount} Aset</strong>
                          </p>
                          <p className="text-slate-300">
                            Total Luas Area: <strong className="text-emerald-300 font-bold">{formatArea(data.utilizedAreaM2)}</strong>
                          </p>
                          <p className="text-slate-400 text-[10px]">Total Portofolio Aset: {data.totalAssets} Unit</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 600 }} />
                <Bar
                  name="Jumlah Lahan Dimanfaatkan"
                  dataKey="utilizedLandCount"
                  fill={colors.emerald}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={44}
                >
                  {filteredUtilizationData.map((entry, index) => (
                    <Cell
                      key={`cell-util-${index}`}
                      fill={entry.utilizedLandCount > 0 ? colors.emerald : '#cbd5e1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table for Chart 1 with Matching Row Numbers */}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase text-slate-500">Tabel Keterangan Nomor Urut Grafik (#)</span>
              <span className="text-[11px] font-bold text-emerald-700">Total: {filteredUtilizationData.length} Kampus</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-2 text-center w-12">No (#)</th>
                  <th className="pb-2">Nama Perguruan Tinggi</th>
                  <th className="pb-2 text-center">Lahan Dimanfaatkan</th>
                  <th className="pb-2 text-right">Total Luas Pemanfaatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {filteredUtilizationData.length > 0 ? (
                  filteredUtilizationData.map((item) => (
                    <tr key={item.university} className="hover:bg-white/80 transition">
                      <td className="py-2.5 text-center font-black text-slate-900 bg-emerald-100/50 rounded-lg">
                        {item.rankLabel}
                      </td>
                      <td className="py-2.5 pl-2 text-slate-900 font-bold max-w-[200px] truncate">{item.university}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-600">{item.utilizedLandCount} Unit</td>
                      <td className="py-2.5 text-right font-mono text-slate-900">{formatArea(item.utilizedAreaM2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      Tidak ada data perguruan tinggi yang cocok dengan pencarian &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CHART 2: Perbandingan Aset Bermasalah vs Tidak Bermasalah per Universitas */}
        <div className="flex flex-col rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-black">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h3 className="text-base font-black text-slate-900">2. Status Permasalahan Aset per Universitas</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                Perbandingan aset normal vs bermasalah dan progres penanganan isu per kampus.
              </p>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-800">
              {filteredIssueData.length} Kampus Tampil
            </span>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredIssueData}
                margin={{ top: 12, right: 16, left: -10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis hide />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                  label={{ value: 'Jumlah Unit Aset', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as UniversityIssueData;
                      return (
                        <div className="rounded-2xl border border-rose-100 bg-slate-900 p-3.5 shadow-xl text-white text-xs space-y-1.5 z-50 min-w-64">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <span className="inline-block rounded-md bg-sky-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                              Nomor Urut {data.rankLabel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">Total Portofolio: {data.totalAssets} Unit Aset</span>
                          </div>
                          <strong className="block font-bold text-sky-300 text-sm leading-tight">{data.university}</strong>
                          
                          <div className="space-y-1 pt-1 text-xs">
                            <div className="flex items-center justify-between text-emerald-400 font-bold">
                              <span>✅ Normal (Bebas Masalah):</span>
                              <span>{data.normalAssets} Unit ({data.healthPercentage}%)</span>
                            </div>
                            <div className="flex items-center justify-between text-rose-400 font-bold">
                              <span>⚠️ Aset Bermasalah:</span>
                              <span>{data.problematicAssets} Unit ({data.problemPercentage}% Aset)</span>
                            </div>
                            {data.totalIssues > 0 && (
                              <div className="flex items-center justify-between text-amber-300 font-bold pt-1.5 border-t border-slate-800/80">
                                <span>🛠️ Progres Penanganan Issue:</span>
                                <span>{data.resolutionPercentage}% ({data.latestStageLabel})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 600 }} />
                <Bar
                  name="Tidak Bermasalah (Normal)"
                  dataKey="normalAssets"
                  stackId="status"
                  fill={colors.emerald}
                  radius={[0, 0, 4, 4]}
                  maxBarSize={44}
                />
                <Bar
                  name="Aset Bermasalah"
                  dataKey="problematicAssets"
                  stackId="status"
                  fill={colors.rose}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table for Chart 2 without Bermasalah Column */}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase text-slate-500">Tabel Keterangan & Persentase Progres (#)</span>
              <span className="text-[11px] font-bold text-rose-700">Total: {filteredIssueData.length} Kampus</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-2 text-center w-12">No (#)</th>
                  <th className="pb-2">Nama Perguruan Tinggi</th>
                  <th className="pb-2 text-center">Normal</th>
                  <th className="pb-2 text-center">Progres Penanganan Issue</th>
                  <th className="pb-2 text-right">Rasio Risiko Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {filteredIssueData.length > 0 ? (
                  filteredIssueData.map((item) => (
                    <tr key={item.university} className="hover:bg-white/80 transition">
                      <td className="py-2.5 text-center font-black text-slate-900 bg-rose-100/50 rounded-lg">
                        {item.rankLabel}
                      </td>
                      <td className="py-2.5 pl-2 text-slate-900 font-bold max-w-[160px] truncate">{item.university}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-600">
                        {item.normalAssets} Unit <span className="text-[10px] text-emerald-700/80">({item.healthPercentage}%)</span>
                      </td>
                      <td className="py-2.5 text-center">
                        {item.totalIssues > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[11px] font-bold text-amber-800">
                              {item.resolutionPercentage}% Progres <span className="text-[10px] text-amber-600 font-normal">({item.latestStageLabel})</span>
                            </span>
                            <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${item.resolutionPercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Tidak ada isu</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${item.problematicAssets > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {item.problematicAssets > 0 ? `⚠️ ${item.problematicAssets} Unit (${item.problemPercentage}%)` : `✅ 100% Sehat`}
                          </span>
                          <div className="h-1.5 w-24 rounded-full bg-rose-200 overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${item.healthPercentage}%` }} />
                            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${item.problemPercentage}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                      Tidak ada data perguruan tinggi yang cocok dengan pencarian &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
