'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Handshake,
  Landmark,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  exportDisposalsToExcel,
  exportIssuesToExcel,
  exportMasterReportToExcel,
  exportUtilizationsToExcel,
} from '@/lib/excel-export';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';
import type { Asset, AssetIssue, BmnDisposalProposal, UserRole, Utilization } from '@/lib/types';

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

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
  utilizations?: Utilization[];
  issues?: AssetIssue[];
  currentRole: UserRole;
  universityOptions?: string[];
  kodeSatker?: string | null;
  universityName?: string | null;
};

type ActiveReportTab = 'pemanfaatan' | 'permasalahan' | 'penghapusan';

export function ReportsManager({
  assets = [],
  utilizations = [],
  issues = [],
  currentRole,
  universityOptions = [],
  kodeSatker,
  universityName,
}: ReportsManagerProps) {
  const [activeTab, setActiveTab] = useState<ActiveReportTab>('pemanfaatan');

  // Disposals data state
  const [disposals, setDisposals] = useState<BmnDisposalProposal[]>([]);
  const [loadingDisposals, setLoadingDisposals] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSatkerFilter, setSelectedSatkerFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('semua');

  // Fetch disposals
  useEffect(() => {
    let isMounted = true;
    setLoadingDisposals(true);

    const query = new URLSearchParams();
    if (kodeSatker) query.set('kode_satker', kodeSatker);

    fetch(`/api/disposals?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data.proposals)) {
          setDisposals(data.proposals);
        }
      })
      .catch((err) => console.error('Gagal mengambil data disposals:', err))
      .finally(() => {
        if (isMounted) setLoadingDisposals(false);
      });

    return () => {
      isMounted = false;
    };
  }, [kodeSatker]);

  // Asset Map for fast lookup
  const assetMap = useMemo(() => {
    return new Map(assets.map((a) => [a.id, a]));
  }, [assets]);

  // Filtered Utilizations
  const filteredUtilizations = useMemo(() => {
    return utilizations.filter((item) => {
      const asset = assetMap.get(item.asset_id);
      const namaAset = (asset?.merk ? `${asset.merk} ${asset.asset_name}` : asset?.asset_name || asset?.nama_barang || '').toLowerCase();
      const satkerStr = (asset?.nama_satker || asset?.campus_name || asset?.kode_satker || '').toLowerCase();
      const thirdParty = (item.third_party_name || '').toLowerCase();
      const pksStr = (item.pks_document_name || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        namaAset.includes(query) ||
        satkerStr.includes(query) ||
        thirdParty.includes(query) ||
        pksStr.includes(query);

      const matchesSatker =
        !selectedSatkerFilter ||
        satkerStr.includes(selectedSatkerFilter.toLowerCase()) ||
        (asset?.kode_satker && extract6DigitKodeSatker(asset.kode_satker) === extract6DigitKodeSatker(selectedSatkerFilter));

      const matchesStatus =
        selectedStatusFilter === 'semua' ||
        (selectedStatusFilter === 'aktif' && item.status === 'aktif') ||
        (selectedStatusFilter === 'akan_berakhir' && item.status === 'akan_berakhir') ||
        (selectedStatusFilter === 'selesai' && item.status === 'selesai');

      return matchesSearch && matchesSatker && matchesStatus;
    });
  }, [utilizations, assetMap, searchTerm, selectedSatkerFilter, selectedStatusFilter]);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const asset = assetMap.get(issue.asset_id);
      const namaAset = (asset?.merk ? `${asset.merk} ${asset.asset_name}` : asset?.asset_name || asset?.nama_barang || '').toLowerCase();
      const satkerStr = (asset?.nama_satker || asset?.campus_name || asset?.kode_satker || '').toLowerCase();
      const titleStr = (issue.issue_title || '').toLowerCase();
      const typeStr = (issue.issue_type || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        namaAset.includes(query) ||
        satkerStr.includes(query) ||
        titleStr.includes(query) ||
        typeStr.includes(query);

      const matchesSatker =
        !selectedSatkerFilter ||
        satkerStr.includes(selectedSatkerFilter.toLowerCase()) ||
        (asset?.kode_satker && extract6DigitKodeSatker(asset.kode_satker) === extract6DigitKodeSatker(selectedSatkerFilter));

      const matchesStatus =
        selectedStatusFilter === 'semua' ||
        (selectedStatusFilter === 'proses' && issue.status === 'proses') ||
        (selectedStatusFilter === 'terbuka' && (issue.status === 'terbuka' || issue.status === 'menunggu')) ||
        (selectedStatusFilter === 'selesai' && issue.status === 'selesai');

      return matchesSearch && matchesSatker && matchesStatus;
    });
  }, [issues, assetMap, searchTerm, selectedSatkerFilter, selectedStatusFilter]);

  // Filtered Disposals
  const filteredDisposals = useMemo(() => {
    return disposals.filter((prop) => {
      const satkerStr = (prop.nama_satker || prop.kode_satker || '').toLowerCase();
      const suratStr = (prop.no_surat_permohonan || '').toLowerCase();
      const jenisStr = (prop.jenis_barang || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        !query ||
        satkerStr.includes(query) ||
        suratStr.includes(query) ||
        jenisStr.includes(query);

      const matchesSatker =
        !selectedSatkerFilter ||
        satkerStr.includes(selectedSatkerFilter.toLowerCase()) ||
        (prop.kode_satker && extract6DigitKodeSatker(prop.kode_satker) === extract6DigitKodeSatker(selectedSatkerFilter));

      const matchesStatus =
        selectedStatusFilter === 'semua' ||
        (selectedStatusFilter === 'menunggu_verifikasi' && prop.status === 'menunggu_verifikasi') ||
        (selectedStatusFilter === 'disetujui' && prop.status === 'disetujui') ||
        (selectedStatusFilter === 'ditolak' && prop.status === 'ditolak');

      return matchesSearch && matchesSatker && matchesStatus;
    });
  }, [disposals, searchTerm, selectedSatkerFilter, selectedStatusFilter]);

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState('');

  // Handle Exports
  const handleExportSingle = () => {
    setIsExporting(true);
    setExportProgress(25);
    setExportLabel(`Mengumpulkan data Laporan ${activeTab.toUpperCase()}...`);

    setTimeout(() => {
      setExportProgress(70);
      setExportLabel('Menyusun format lembar kerja Excel...');

      setTimeout(() => {
        if (activeTab === 'pemanfaatan') {
          exportUtilizationsToExcel(filteredUtilizations, assets);
        } else if (activeTab === 'permasalahan') {
          exportIssuesToExcel(filteredIssues, assets);
        } else if (activeTab === 'penghapusan') {
          exportDisposalsToExcel(filteredDisposals);
        }
        setExportProgress(100);
        setExportLabel('Ekspor selesai!');

        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
        }, 500);
      }, 200);
    }, 200);
  };

  const handleExportMasterMultiSheet = () => {
    setIsExporting(true);
    setExportProgress(15);
    setExportLabel('Mengumpulkan data Laporan Pemanfaatan, Permasalahan, & Penghapusan BMN...');

    setTimeout(() => {
      setExportProgress(50);
      setExportLabel('Menyusun 3 Sheet terpisah & memformat angka Rupiah...');

      setTimeout(() => {
        setExportProgress(85);
        setExportLabel('Menulis file XLSX & mengkalkulasi lebar kolom...');

        setTimeout(() => {
          exportMasterReportToExcel(filteredUtilizations, filteredIssues, filteredDisposals, assets);
          setExportProgress(100);
          setExportLabel('Ekspor Multi-Sheet berhasil!');

          setTimeout(() => {
            setIsExporting(false);
            setExportProgress(0);
          }, 600);
        }, 250);
      }, 250);
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
                Pusat Laporan & Ekspor Berkas Excel BMN
              </h2>
              <p className="mt-1 text-xs font-medium text-secondary">
                Unduh rekapitulasi data Pemanfaatan, Permasalahan, dan Penghapusan BMN secara terpisah maupun gabungan Multi-Sheet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportMasterMultiSheet}
              className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
              title="Unduh 1 File Excel dengan 3 Sheet Terpisah"
            >
              <Download className="h-4 w-4" />
              Ekspor Semua Laporan (Multi-Sheet Excel)
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pemanfaatan');
              setSelectedStatusFilter('semua');
            }}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
              activeTab === 'pemanfaatan'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            <Handshake className="h-4 w-4" />
            <span>Laporan Pemanfaatan Aset</span>
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {filteredUtilizations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('permasalahan');
              setSelectedStatusFilter('semua');
            }}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
              activeTab === 'permasalahan'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            <CircleAlert className="h-4 w-4" />
            <span>Laporan Permasalahan Aset</span>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {filteredIssues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('penghapusan');
              setSelectedStatusFilter('semua');
            }}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
              activeTab === 'penghapusan'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>Laporan Penghapusan BMN</span>
            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
              {filteredDisposals.length}
            </span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 grid gap-3 sm:grid-cols-12">
          {/* Live Search */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama aset, kode barang, satker, mitra, no. surat..."
              className="w-full rounded-xl border border-border bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Satker Filter */}
          {universityOptions.length > 0 && (
            <div className="sm:col-span-3">
              <select
                value={selectedSatkerFilter}
                onChange={(e) => setSelectedSatkerFilter(e.target.value)}
                className="w-full rounded-xl border border-border bg-slate-50 py-2.5 px-3 text-xs font-medium text-foreground focus:border-primary focus:bg-white focus:outline-none"
              >
                <option value="">Semua Satker / PTN</option>
                {universityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-slate-50 py-2.5 px-3 text-xs font-medium text-foreground focus:border-primary focus:bg-white focus:outline-none"
            >
              <option value="semua">Semua Status</option>
              {activeTab === 'pemanfaatan' && (
                <>
                  <option value="aktif">Status: Aktif</option>
                  <option value="akan_berakhir">Status: Akan Berakhir</option>
                  <option value="selesai">Status: Selesai</option>
                </>
              )}
              {activeTab === 'permasalahan' && (
                <>
                  <option value="terbuka">Status: Terbuka / Menunggu</option>
                  <option value="proses">Status: Proses Penanganan</option>
                  <option value="selesai">Status: Selesai</option>
                </>
              )}
              {activeTab === 'penghapusan' && (
                <>
                  <option value="menunggu_verifikasi">Status: Menunggu Verifikasi</option>
                  <option value="disetujui">Status: Disetujui</option>
                  <option value="ditolak">Status: Ditolak</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area per Tab */}
      <div className="rounded-card border border-border bg-white p-6 shadow-sm">
        {/* Tab Specific Bar & Single Export Button */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {activeTab === 'pemanfaatan' && 'Pratinjau Data Laporan Pemanfaatan Aset'}
              {activeTab === 'permasalahan' && 'Pratinjau Data Laporan Permasalahan Aset'}
              {activeTab === 'penghapusan' && 'Pratinjau Data Laporan Pengusulan Penghapusan BMN'}
            </h3>
            <p className="text-xs text-secondary font-medium">
              Menampilkan {activeTab === 'pemanfaatan' ? filteredUtilizations.length : activeTab === 'permasalahan' ? filteredIssues.length : filteredDisposals.length} data sesuai kriteria pencarian.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportSingle}
            className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-primary px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-primary-hover active:scale-95"
          >
            <Download className="h-4 w-4" />
            Ekspor Excel ({activeTab === 'pemanfaatan' ? 'Pemanfaatan' : activeTab === 'permasalahan' ? 'Permasalahan' : 'Penghapusan'})
          </button>
        </div>

        {/* TAB 1: PEMANFAATAN ASET TABLE */}
        {activeTab === 'pemanfaatan' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50 font-semibold text-foreground">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Kode / Satker</th>
                  <th className="px-4 py-3">Nama Aset</th>
                  <th className="px-4 py-3">Jenis Pemanfaatan</th>
                  <th className="px-4 py-3">Mitra / Pihak Ke-3</th>
                  <th className="px-4 py-3">Masa Berlaku</th>
                  <th className="px-4 py-3">No. Dokumen PKS</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredUtilizations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-secondary">
                      Tidak ada data pemanfaatan aset yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUtilizations.map((item, idx) => {
                    const asset = assetMap.get(item.asset_id);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{asset?.nama_satker || asset?.campus_name || '-'}</div>
                          <div className="text-[11px] text-secondary">{asset?.kode_satker || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">
                            {asset?.merk ? `${asset.merk} (${asset.asset_name})` : asset?.asset_name || `Aset #${item.asset_id}`}
                          </div>
                          <div className="text-[11px] text-secondary">Kode: {asset?.kode_barang || asset?.asset_code || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                            {item.utilization_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{item.third_party_name || '-'}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {formatDate(item.start_date)} s.d. {formatDate(item.end_date)}
                        </td>
                        <td className="px-4 py-3 text-secondary font-mono text-[11px]">{item.pks_document_name || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              item.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'akan_berakhir'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status === 'aktif' ? 'Aktif' : item.status === 'akan_berakhir' ? 'Akan Berakhir' : 'Selesai'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PERMASALAHAN ASET TABLE */}
        {activeTab === 'permasalahan' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50 font-semibold text-foreground">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Kode / Satker</th>
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
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{asset?.nama_satker || asset?.campus_name || '-'}</div>
                          <div className="text-[11px] text-secondary">{asset?.kode_satker || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">
                            {asset?.merk ? `${asset.merk} (${asset.asset_name})` : asset?.asset_name || `Aset #${issue.asset_id}`}
                          </div>
                          <div className="text-[11px] text-secondary">Kode: {asset?.kode_barang || asset?.asset_code || '-'}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{issue.issue_title}</td>
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
        )}

        {/* TAB 3: PENGHAPUSAN BMN TABLE */}
        {activeTab === 'penghapusan' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            {loadingDisposals ? (
              <div className="flex items-center justify-center py-10 text-xs text-secondary gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Memuat data usulan penghapusan BMN...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-slate-50 font-semibold text-foreground">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Satker / Universitas</th>
                    <th className="px-4 py-3">No. Surat Permohonan</th>
                    <th className="px-4 py-3">Deskripsi Barang</th>
                    <th className="px-4 py-3 text-right">Jumlah (Unit)</th>
                    <th className="px-4 py-3 text-right">Nilai Perolehan</th>
                    <th className="px-4 py-3">Tanggal Pengajuan</th>
                    <th className="px-4 py-3 text-center">Status Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filteredDisposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-secondary">
                        Tidak ada data usulan penghapusan BMN yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredDisposals.map((prop, idx) => (
                      <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div>{prop.nama_satker}</div>
                          <div className="text-[11px] text-secondary font-mono">Kode: {prop.kode_satker}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{prop.no_surat_permohonan}</td>
                        <td className="px-4 py-3 font-medium">{prop.jenis_barang || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold">{prop.jumlah_barang}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {formatRupiah(prop.nilai_perolehan)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-secondary">{formatDate(prop.created_at)}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              prop.status === 'disetujui'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prop.status === 'ditolak'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {prop.status === 'disetujui'
                              ? 'Disetujui'
                              : prop.status === 'ditolak'
                              ? 'Ditolak'
                              : 'Menunggu Verifikasi'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Export Progress Modal Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 animate-bounce">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-extrabold text-[#080C1A]">Menyiapkan Laporan Excel BMN</h4>
              <p className="mt-1 text-xs text-[#6A7686]">{exportLabel}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700 block">{exportProgress}% Selesai</span>
          </div>
        </div>
      )}
    </section>
  );
}
