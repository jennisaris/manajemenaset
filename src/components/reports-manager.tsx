'use client';

import { useMemo, useState } from 'react';
import {
  CircleAlert,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
} from 'lucide-react';
import { exportIssuesToExcel } from '@/lib/excel-export';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';
import type { Asset, AssetIssue, UserRole } from '@/lib/types';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

type ReportsManagerProps = {
  assets?: Asset[];
  utilizations?: any;
  issues?: AssetIssue[];
  currentRole: UserRole;
  universityOptions?: string[];
  kodeSatker?: string | null;
  universityName?: string | null;
};

export function ReportsManager({
  assets = [],
  issues = [],
  currentRole,
  universityOptions = [],
  kodeSatker,
  universityName,
}: ReportsManagerProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSatkerFilter, setSelectedSatkerFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('semua');

  // Asset Map for fast lookup
  const assetMap = useMemo(() => {
    return new Map(assets.map((a) => [a.id, a]));
  }, [assets]);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      const asset = assetMap.get(item.asset_id);
      const namaAset = (asset?.merk ? `${asset.merk} ${asset.asset_name}` : asset?.asset_name || asset?.nama_barang || '').toLowerCase();
      const satkerStr = (asset?.nama_satker || asset?.campus_name || asset?.kode_satker || '').toLowerCase();
      const issueTitle = (item.issue_title || '').toLowerCase();
      const issueDesc = (item.description || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        namaAset.includes(query) ||
        satkerStr.includes(query) ||
        issueTitle.includes(query) ||
        issueDesc.includes(query);

      let matchesSatker = true;
      if (selectedSatkerFilter) {
        const filterDigits = extract6DigitKodeSatker(selectedSatkerFilter);
        const assetKodeDigits = extract6DigitKodeSatker(asset?.kode_satker);
        matchesSatker =
          (asset?.campus_name && asset.campus_name.toLowerCase() === selectedSatkerFilter.toLowerCase()) ||
          (asset?.nama_satker && asset.nama_satker.toLowerCase() === selectedSatkerFilter.toLowerCase()) ||
          Boolean(filterDigits && assetKodeDigits && filterDigits === assetKodeDigits);
      }

      let matchesStatus = true;
      if (selectedStatusFilter !== 'semua') {
        matchesStatus = item.status === selectedStatusFilter;
      }

      return matchesSearch && matchesSatker && matchesStatus;
    });
  }, [issues, assetMap, searchTerm, selectedSatkerFilter, selectedStatusFilter]);

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState('');

  // Handle Export
  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(25);
    setExportLabel('Mengumpulkan data Laporan Permasalahan Aset...');

    setTimeout(() => {
      setExportProgress(70);
      setExportLabel('Menyusun lembar kerja Excel...');

      setTimeout(() => {
        exportIssuesToExcel(filteredIssues, assets);
        setExportProgress(100);
        setExportLabel('Ekspor selesai!');

        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
        }, 500);
      }, 200);
    }, 200);
  };

  return (
    <section className="mt-6 flex flex-col gap-6" id="reports">
      {/* Top Header Card */}
      <div className="rounded-card border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Laporan & Ekspor Berkas Excel Permasalahan BMN
              </h2>
              <p className="mt-1 text-xs font-medium text-secondary">
                Unduh rekapitulasi data permasalahan, sengketa, dan progres penanganan BMN ke dalam format spreadsheet Excel.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              title="Unduh Berkas Excel Laporan Permasalahan"
            >
              <Download className="h-4 w-4" />
              Ekspor Excel Laporan Permasalahan ({filteredIssues.length} Kasus)
            </button>
          </div>
        </div>

        {/* Export Progress Bar */}
        {isExporting && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>{exportLabel}</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter and Table Content */}
      <div className="rounded-card border border-border bg-white p-6 shadow-sm space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari universitas, nama aset, judul masalah..."
              className="w-full rounded-2xl border border-border bg-gray-50 pl-10 pr-4 py-2 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Universitas */}
            {universityOptions.length > 0 && currentRole !== 'Operator Kampus' && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-secondary" />
                <select
                  value={selectedSatkerFilter}
                  onChange={(e) => setSelectedSatkerFilter(e.target.value)}
                  className="rounded-2xl border border-border bg-gray-50 px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:bg-white cursor-pointer"
                >
                  <option value="">Semua Universitas / LLDIKTI</option>
                  {universityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="rounded-2xl border border-border bg-gray-50 px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:bg-white cursor-pointer"
            >
              <option value="semua">Semua Status Penanganan</option>
              <option value="terbuka">Terbuka (Open)</option>
              <option value="proses">Dalam Proses</option>
              <option value="selesai">Selesai (Resolved)</option>
            </select>
          </div>
        </div>

        {/* Issues Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-semibold text-foreground">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3 min-w-[200px]">Universitas / LLDIKTI</th>
                <th className="px-4 py-3">Nama Aset</th>
                <th className="px-4 py-3">Judul Permasalahan</th>
                <th className="px-4 py-3">Jenis Permasalahan</th>
                <th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">Tgl Kejadian</th>
                <th className="px-4 py-3 text-center">Status Penanganan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-secondary">
                    Tidak ada data permasalahan aset yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const asset = assetMap.get(issue.asset_id);
                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="font-semibold text-foreground whitespace-normal break-words leading-snug" title={asset?.nama_satker || asset?.campus_name || ''}>
                          {asset?.nama_satker || asset?.campus_name || '-'}
                        </div>
                        <div className="text-[11px] text-secondary">{asset?.kode_satker || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">
                          {asset?.merk ? `${asset.merk} (${asset.asset_name})` : asset?.asset_name || `Aset #${issue.asset_id}`}
                        </div>
                        <div className="text-[11px] text-secondary">Kode: {asset?.kode_barang || asset?.asset_code || '-'}</div>
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="font-bold text-foreground">{issue.issue_title}</div>
                        {issue.description ? (
                          <div className="mt-1 text-xs font-normal text-slate-500 whitespace-normal break-words leading-relaxed max-w-sm">
                            {issue.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-secondary">{issue.issue_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            issue.priority === 'tinggi'
                              ? 'bg-red-100 text-red-700'
                              : issue.priority === 'sedang'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {issue.priority === 'tinggi' ? 'Tinggi' : issue.priority === 'sedang' ? 'Sedang' : 'Rendah'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-secondary">{formatDate(issue.found_date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            issue.status === 'selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : issue.status === 'proses'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {issue.status === 'selesai' ? 'Selesai' : issue.status === 'proses' ? 'Proses' : 'Terbuka'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
