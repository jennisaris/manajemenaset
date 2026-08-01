'use client';

import { useMemo } from 'react';
import { AlertTriangle, Archive, BadgeCheck, BarChart3, Building2, Handshake, Landmark, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Asset, AssetIssue, BmnDisposalProposal, DashboardSummary, Utilization } from '@/lib/types';

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

const DEMO_DISPOSALS: BmnDisposalProposal[] = [
  {
    id: 1,
    kode_satker: '693374',
    nama_satker: 'Universitas Siliwangi',
    no_surat_permohonan: 'UN43/BMN/PH/2026/012',
    jenis_barang: 'Alat Angkut Bermotor & TIK',
    jumlah_barang: 18,
    nilai_perolehan: 785000000,
    status: 'menunggu_verifikasi',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    kode_satker: '001023',
    nama_satker: 'Universitas Indonesia',
    no_surat_permohonan: 'UI/LOG/BMN-DEL/2026/005',
    jenis_barang: 'Peralatan Laboratorium & Non TIK',
    jumlah_barang: 42,
    nilai_perolehan: 1450000000,
    status: 'disetujui',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    kode_satker: '001045',
    nama_satker: 'Institut Teknologi Bandung',
    no_surat_permohonan: 'ITB/BMN/PH-SK/2026/009',
    jenis_barang: 'Komputer Server & Jaringan TIK',
    jumlah_barang: 25,
    nilai_perolehan: 620000000,
    status: 'menunggu_verifikasi',
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    kode_satker: '001089',
    nama_satker: 'Universitas Gadjah Mada',
    no_surat_permohonan: 'UGM/ASET/PH/2026/014',
    jenis_barang: 'Bangunan Gedung Tua (Rusak Berat)',
    jumlah_barang: 2,
    nilai_perolehan: 3200000000,
    status: 'disetujui',
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    kode_satker: '001077',
    nama_satker: 'Universitas Airlangga',
    no_surat_permohonan: 'UNAIR/BMN/2026/003',
    jenis_barang: 'Kendaraan Dinas Operasional',
    jumlah_barang: 6,
    nilai_perolehan: 940000000,
    status: 'ditolak',
    created_at: new Date().toISOString(),
  },
];

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

export function ExecutiveAnalytics({
  assets,
  summary,
  utilizations,
  issues,
  disposals = [],
}: {
  assets: Asset[];
  summary: DashboardSummary;
  utilizations: Utilization[];
  issues: AssetIssue[];
  disposals?: BmnDisposalProposal[];
}) {
  const activeDisposals = disposals.length > 0 ? disposals : DEMO_DISPOSALS;

  // Agregasi Penghapusan per Satker untuk Grafik
  const satkerDisposalSummary = useMemo(() => {
    const map = new Map<string, {
      satkerName: string;
      totalNilai: number;
      totalJumlah: number;
      jenisList: Set<string>;
    }>();

    for (const d of activeDisposals) {
      const name = d.nama_satker || `[${d.kode_satker}] Satker`;
      if (!map.has(name)) {
        map.set(name, {
          satkerName: name,
          totalNilai: 0,
          totalJumlah: 0,
          jenisList: new Set(),
        });
      }
      const rec = map.get(name)!;
      rec.totalNilai += Number(d.nilai_perolehan || 0);
      rec.totalJumlah += Number(d.jumlah_barang || 1);
      if (d.jenis_barang) rec.jenisList.add(d.jenis_barang);
    }

    return Array.from(map.values()).map((item) => ({
      satkerLabel: item.satkerName.length > 22 ? `${item.satkerName.substring(0, 20)}...` : item.satkerName,
      fullSatker: item.satkerName,
      totalNilai: item.totalNilai,
      totalJumlah: item.totalJumlah,
      jenis: Array.from(item.jenisList).join(', ') || 'BMN Rusak Berat',
    }));
  }, [activeDisposals]);

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
            Visualisasi terkelompok untuk membaca Data Aset, Pemanfaatan Pihak Ketiga, Permasalahan Risiko, dan Permohonan Penghapusan BMN.
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
            <p className="text-xs text-slate-500 font-medium">Distribusi sub-kategori barang, jenis fisik BMN, dan total luas area tercatat.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Grafik Sub-Kategori BMN */}
          <ChartCard title="Grafik Data Aset (Sub-Kategori BMN)" subtitle="Distribusi seluruh unit aset berdasarkan kelompok BMN." icon={Landmark}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetCategoryData} margin={{ top: 8, right: 8, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                <XAxis dataKey="label" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Unit`} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {assetCategoryData.map((item) => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Grafik Komposisi Tanah vs Bangunan */}
          <ChartCard title="Komposisi Fisik Tanah vs Bangunan" subtitle="Perbandingan jumlah unit fisik dan luas area tercatat (m²)." icon={PieChartIcon}>
            <div className="grid h-full gap-4 sm:grid-cols-[1fr_1fr]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetComposition} dataKey="value" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                    {assetComposition.map((item) => <Cell key={item.label} fill={item.color} />)}
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
      </div>

      {/* BAGIAN 2: PEMANFAATAN & PERMASALAHAN (DIBUAT 1 BARIS SIDE-BY-SIDE) */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-[#165DFF] font-black text-xs border border-sky-200 shadow-xs">
            2
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              🤝 Pemanfaatan & ⚠️ Permasalahan Aset
            </h3>
            <p className="text-xs text-slate-500 font-medium">Status masa berlaku kontrak pemanfaatan pihak ketiga dan prioritas urgensi risiko permasalahan.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Chart Left: Pemanfaatan Aset */}
          <ChartCard title="Pemanfaatan Pihak Ketiga & Status Kontrak" subtitle="Ringkasan status kontrak aktif, akan berakhir, dan berakhir." icon={Handshake}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={utilizationStatusData.length ? utilizationStatusData : [{ label: 'Belum ada', value: 0, color: colors.slate }]} dataKey="value" nameKey="label" innerRadius={60} outerRadius={90} paddingAngle={4} label={({ name, value }) => `${name}: ${value} Kontrak`}>
                  {(utilizationStatusData.length ? utilizationStatusData : [{ label: 'Belum ada', value: 0, color: colors.slate }]).map((item) => <Cell key={item.label} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${nf.format(Number(value))} Kontrak Kerjasama`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart Right: Permasalahan & Risiko */}
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
        </div>
      </div>

      {/* BAGIAN 3: USULAN PENGHAPUSAN BMN */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-800 font-black text-xs border border-amber-200 shadow-xs">
            3
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              🗑️ Usulan Penghapusan BMN
            </h3>
            <p className="text-xs text-slate-500 font-medium">Usulan permohonan penghapusan BMN per Satker, nilai perolehan (Rp), dan tabel rincian berkas.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-1">
          {/* Grafik Usulan Penghapusan per Satker */}
          <ChartCard title="Grafik Usulan Penghapusan BMN per Satker" subtitle="Nilai perolehan usulan penghapusan BMN dari masing-masing Satker." icon={Archive}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satkerDisposalSummary} margin={{ top: 8, right: 8, left: 10, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fef3c7" />
                <XAxis dataKey="satkerLabel" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-xl text-xs space-y-1.5 min-w-[220px]">
                          <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between gap-2">
                            <span>🏛️ {data.fullSatker}</span>
                          </div>
                          <div className="text-slate-600">
                            <span className="font-semibold text-slate-400 block text-[10px] uppercase">Jenis BMN Usulan:</span>
                            <span className="font-extrabold text-amber-700">{data.jenis}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-500">Jumlah Unit:</span>
                            <span className="font-black text-slate-900">{nf.format(data.totalJumlah)} Unit</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Nilai Perolehan:</span>
                            <span className="font-black text-emerald-600">Rp {nf.format(data.totalNilai)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalNilai" radius={[10, 10, 0, 0]}>
                  {satkerDisposalSummary.map((item, idx) => (
                    <Cell key={item.satkerLabel} fill={idx % 2 === 0 ? colors.amber : colors.sky} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tabel Rincian Lengkap */}
          <div className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur-xl space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">Rincian Permohonan Penghapusan BMN Satker</h3>
                    <p className="text-xs text-slate-500 font-medium">Detail Satker pengaju, jenis BMN, jumlah unit barang, dan total nilai perolehan.</p>
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-black text-amber-700 self-start sm:self-auto">
                Total: {activeDisposals.length} Usulan Permohonan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Satker Pengaju</th>
                    <th className="py-3 px-4">No. Surat Permohonan</th>
                    <th className="py-3 px-4">Jenis Barang BMN</th>
                    <th className="py-3 px-4 text-center">Jumlah Unit</th>
                    <th className="py-3 px-4 text-right">Total Nilai Perolehan (Rp)</th>
                    <th className="py-3 px-4 text-center">Status Usulan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {activeDisposals.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-900 font-black text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold">{item.nama_satker || `[${item.kode_satker}] Satker`}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {item.no_surat_permohonan || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-900">
                        {item.jenis_barang || 'Aset BMN Rusak/Usang'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-900">
                        {nf.format(item.jumlah_barang || 1)} Unit
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                        Rp {nf.format(item.nilai_perolehan || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          item.status === 'disetujui'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'ditolak'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status === 'disetujui' ? '✅ SK Terbit' : item.status === 'ditolak' ? '❌ Ditolak' : '⏳ Verifikasi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
