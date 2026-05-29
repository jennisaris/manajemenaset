'use client';

import { AlertTriangle, BadgeCheck, BarChart3, Handshake, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Asset, AssetIssue, DashboardSummary, Utilization } from '@/lib/types';

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

function formatStatus(value: string) {
  return value.replaceAll('_', ' ');
}

export function ExecutiveAnalytics({ assets, summary, utilizations, issues }: { assets: Asset[]; summary: DashboardSummary; utilizations: Utilization[]; issues: AssetIssue[] }) {
  const assetComposition = [
    { label: 'Tanah', value: assets.filter((asset) => asset.asset_type === 'land').length, color: colors.emerald },
    { label: 'Bangunan', value: assets.filter((asset) => asset.asset_type === 'building').length, color: colors.sky },
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

  const utilizationStatusData = Object.entries(
    utilizations.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, value]) => ({ label: formatStatus(status), value, color: status === 'aktif' ? colors.emerald : status === 'akan_berakhir' ? colors.amber : status === 'berakhir' ? colors.slate : colors.sky }));

  const areaData = [
    { label: 'Luas Tanah', value: summary.total_land_area_m2, color: colors.emerald },
    { label: 'Luas Bangunan', value: summary.total_building_area_m2, color: colors.sky },
  ];

  return (
    <section className="mt-5" id="analytics">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-black text-sky-700 shadow-sm backdrop-blur"><BarChart3 className="mr-2 h-4 w-4" /> Analitik Pimpinan</p>
          <h2 className="text-xl font-black tracking-[-.03em] text-slate-950 sm:text-2xl">Grafik Ringkas Portofolio Aset</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Visual cepat untuk membaca komposisi aset, progres verifikasi, risiko permasalahan, dan status pemanfaatan.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Komposisi Aset" subtitle="Perbandingan jumlah tanah dan bangunan." icon={PieChartIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={assetComposition} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {assetComposition.map((item) => <Cell key={item.label} fill={item.color} />)}
              </Pie>
              <Tooltip formatter={(value) => nf.format(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Verifikasi" subtitle="Backlog dan progres validasi data aset." icon={BadgeCheck}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={verificationData} margin={{ top: 8, right: 8, left: -20, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
              <XAxis dataKey="label" angle={-18} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={(value) => nf.format(Number(value))} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {verificationData.map((item) => <Cell key={item.key} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Prioritas Permasalahan" subtitle="Aset bermasalah aktif berdasarkan tingkat urgensi." icon={AlertTriangle}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={issuePriorityData} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0f2fe" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={78} />
              <Tooltip formatter={(value) => nf.format(Number(value))} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {issuePriorityData.map((item) => <Cell key={item.key} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pemanfaatan & Luas" subtitle="Status kontrak pihak ketiga dan skala area tercatat." icon={Handshake}>
          <div className="grid h-full gap-4 sm:grid-cols-[1fr_1fr]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={utilizationStatusData.length ? utilizationStatusData : [{ label: 'Belum ada', value: 0, color: colors.slate }]} dataKey="value" nameKey="label" outerRadius={76} label={({ name, value }) => `${name}: ${value}`}>
                  {(utilizationStatusData.length ? utilizationStatusData : [{ label: 'Belum ada', value: 0, color: colors.slate }]).map((item) => <Cell key={item.label} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => nf.format(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} layout="vertical" margin={{ top: 8, right: 8, left: 22, bottom: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} width={88} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} m²`} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {areaData.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
