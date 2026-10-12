'use client';

import { useMemo } from 'react';
import { AlertTriangle, BadgeCheck, BarChart3, Building2, Landmark, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Asset, AssetIssue, DashboardSummary } from '@/lib/types';

const nf = new Intl.NumberFormat('id-ID');

const colors = {
  sky: '#0284c7',
  blue: '#1d4ed8',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#64748b',
  violet: '#7c3aed',
};

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white/85 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5" /></div>
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function countBy<T extends string>(items: T[], labels: Record<T, string>, palette: Record<T, string>) {
  return Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    value: items.filter((item) => item === key).length,
    color: palette[key as T],
  }));
}

export function ExecutiveAnalytics({
  assets,
  summary,
  issues,
}: {
  assets: Asset[];
  summary: DashboardSummary;
  utilizations?: any;
  issues: AssetIssue[];
  disposals?: any;
}) {
  const assetComposition = [
    { label: 'Tanah', value: assets.filter((asset) => asset.asset_type === 'land').length, color: colors.emerald },
    { label: 'Bangunan', value: assets.filter((asset) => asset.asset_type === 'building').length, color: colors.sky },
  ];

  // Grafik Data Aset per Sub-Kategori / Jenis BMN
  const assetCategoryData = [
    { label: 'Bangunan / Tanah', value: assets.filter((a) => a.asset_type === 'land' || a.asset_type === 'building' || !(a as any).category || (a as any).category === 'bangunan').length, color: colors.emerald },
    { label: 'Alat Angkut', value: assets.filter((a) => (a as any).category === 'alat_angkutan' || (typeof a.nama_barang === 'string' && /mobil|motor|kendaraan|innova/i.test(a.nama_barang))).length, color: colors.blue },
    { label: 'Khusus TIK', value: assets.filter((a) => (a as any).category === 'khusus_tik' || (typeof a.nama_barang === 'string' && /komputer|server|laptop|tik/i.test(a.nama_barang))).length, color: colors.violet },
    { label: 'Non TIK', value: assets.filter((a) => (a as any).category === 'non_tik').length, color: colors.amber },
  ];

  const verificationData = countBy(
    assets.map((asset) => asset.verification_status),
    {
      draft: 'Draft',
      menunggu_verifikasi: 'Menunggu',
      revisi: 'Revisi',
      terverifikasi: 'Terverifikasi',
      tidak_aktif: 'Tidak Aktif',
    },
    {
      draft: colors.slate,
      menunggu_verifikasi: colors.amber,
      revisi: colors.violet,
      terverifikasi: colors.emerald,
      tidak_aktif: colors.rose,
    },
  );

  const issuePriorityData = countBy(
    issues.filter((issue) => issue.status !== 'selesai').map((issue) => issue.priority as 'rendah' | 'sedang' | 'tinggi' | 'mendesak'),
    { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi', mendesak: 'Mendesak' },
    { rendah: colors.sky, sedang: colors.amber, tinggi: colors.rose, mendesak: '#9f1239' },
  );

  const issueTypeData = useMemo(() => {
    const active = issues.filter((i) => i.status !== 'selesai');
    const counts: Record<string, number> = {};
    for (const item of active) {
      const type = item.issue_type || 'lainnya';
      counts[type] = (counts[type] || 0) + 1;
    }
    const typeLabels: Record<string, string> = {
      sengketa_tanah: 'Sengketa Lahan',
      klaim_pihak_ketiga: 'Klaim Pihak Lain',
      dokumen_bermasalah: 'Legalitas/Dokumen',
      batas_lahan_tidak_jelas: 'Batas Patok',
      bangunan_rusak: 'Fisik Rusak',
      aset_dikuasai_pihak_lain: 'Dikuasai Pihak Lain',
      lainnya: 'Lainnya',
    };
    return Object.entries(counts).map(([k, v], idx) => ({
      key: k,
      label: typeLabels[k] || k.replaceAll('_', ' '),
      value: v,
      color: [colors.rose, colors.amber, colors.sky, colors.violet, colors.emerald, colors.blue][idx % 6],
    }));
  }, [issues]);

  const areaData = [
    { label: 'Luas Tanah', value: summary.total_land_area_m2, color: colors.emerald },
    { label: 'Luas Bangunan', value: summary.total_building_area_m2, color: colors.sky },
  ];

  return (
    <section className="mt-8 space-y-10" id="analytics">
      {/* Title Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-5">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-extrabold text-[#165DFF] shadow-xs">
            <BarChart3 className="mr-2 h-4 w-4" /> Dashboard Analitik Eksekutif Pimpinan
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Ringkasan Analitik & Portofolio BMN
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 font-medium">
            Visualisasi terkelompok untuk membaca Data Aset BMN dan Permasalahan Risiko.
          </p>
        </div>
      </div>

      {/* BAGIAN 1: DATA ASET */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200 shadow-xs">
            1
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              🏢 Data Aset BMN
            </h3>
            <p className="text-xs text-slate-500 font-medium">Distribusi tipe fisik aset, kategori sub-menu BMN, status verifikasi, dan luas area.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* Sub-Kategori BMN */}
          <ChartCard title="Grafik Data Aset (Sub-Kategori BMN)" subtitle="Distribusi seluruh unit aset berdasarkan kelompok BMN." icon={Landmark}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetCategoryData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Unit Aset`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {assetCategoryData.map((item) => (
                    <Cell key={item.label} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Komposisi Tanah vs Bangunan */}
          <ChartCard title="Komposisi Aset" subtitle="Perbandingan jumlah unit tanah dan bangunan." icon={Building2}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetComposition} dataKey="value" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={4}>
                  {assetComposition.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Unit`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Status Verifikasi */}
          <ChartCard title="Status Verifikasi" subtitle="Progres kelengkapan data administratif." icon={BadgeCheck}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={verificationData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Unit`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {verificationData.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Luas Area m2 */}
          <ChartCard title="Perbandingan Luas (m²)" subtitle="Total akumulasi luas tanah dan bangunan." icon={Landmark}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} m²`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {areaData.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* BAGIAN 2: PERMASALAHAN & RISIKO ASET */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-700 font-black text-xs border border-rose-200 shadow-xs">
            2
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              ⚠️ Permasalahan & Risiko Aset
            </h3>
            <p className="text-xs text-slate-500 font-medium">Pemetaan level urgensi risiko permasalahan dan klasifikasi jenis sengketa aktif.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Chart Left: Permasalahan & Risiko */}
          <ChartCard title="Prioritas Permasalahan Aset" subtitle="Pemetaan kasus sengketa / kerusakan aktif berdasarkan urgensi." icon={AlertTriangle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issuePriorityData} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0f2fe" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={88} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Kasus`} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {issuePriorityData.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart Right: Klasifikasi Jenis Permasalahan */}
          <ChartCard title="Klasifikasi Jenis Masalah" subtitle="Sebaran kategori permasalahan legalitas, patok, fisik, atau konflik." icon={PieChartIcon}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={issueTypeData.length ? issueTypeData : [{ label: 'Tidak ada kasus aktif', value: 0, color: colors.emerald }]} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                  {(issueTypeData.length ? issueTypeData : [{ label: 'Tidak ada kasus aktif', value: 0, color: colors.emerald }]).map((item) => <Cell key={item.label} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Kasus`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </section>
  );
}
