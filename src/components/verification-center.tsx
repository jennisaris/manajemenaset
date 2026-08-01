'use client';

import { useEffect, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { Asset, BmnDisposalProposal, UserRole } from '@/lib/types';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';
import { AssetList } from './asset-list';

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

export function VerificationCenter({
  assets,
  currentRole,
  currentUniversity,
  onAssetsChange,
  onStatusChanged,
}: {
  assets: Asset[];
  currentRole: UserRole;
  currentUniversity: string | null;
  onAssetsChange?: (assets: Asset[]) => void;
  onStatusChanged?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'asset' | 'disposal'>('asset');

  // Disposal Verification State
  const [disposals, setDisposals] = useState<BmnDisposalProposal[]>([]);
  const [loadingDisposals, setLoadingDisposals] = useState(true);
  const [disposalSearch, setDisposalSearch] = useState('');
  const [disposalStatusFilter, setDisposalStatusFilter] = useState('all');
  const [selectedDisposal, setSelectedDisposal] = useState<BmnDisposalProposal | null>(null);

  // Filter pending assets (menunggu_verifikasi)
  const pendingAssetsCount = assets.filter((a) => a.verification_status === 'menunggu_verifikasi').length;

  async function fetchDisposals() {
    setLoadingDisposals(true);
    try {
      const res = await fetch('/api/disposals');
      if (res.ok) {
        const json = await res.json();
        setDisposals(json.proposals || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data usulan penghapusan:', err);
    } finally {
      setLoadingDisposals(false);
    }
  }

  useEffect(() => {
    fetchDisposals();
  }, []);

  async function handleUpdateDisposalStatus(id: number, status: string, catatan?: string) {
    try {
      const res = await fetch('/api/disposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, catatan }),
      });
      if (res.ok) {
        fetchDisposals();
        onStatusChanged?.();
        if (selectedDisposal && selectedDisposal.id === id) {
          setSelectedDisposal((prev) => (prev ? { ...prev, status: status as any, catatan: catatan ?? prev.catatan } : null));
        }
      }
    } catch (err) {
      console.error('Gagal memperbarui status usulan penghapusan:', err);
    }
  }

  const pendingDisposalsCount = disposals.filter((d) => d.status === 'menunggu_verifikasi').length;

  const filteredDisposals = disposals.filter((item) => {
    const matchSearch =
      item.no_surat_permohonan.toLowerCase().includes(disposalSearch.toLowerCase()) ||
      item.nama_satker.toLowerCase().includes(disposalSearch.toLowerCase()) ||
      item.kode_satker.includes(disposalSearch) ||
      (item.jenis_barang && item.jenis_barang.toLowerCase().includes(disposalSearch.toLowerCase()));

    const matchStatus =
      disposalStatusFilter === 'all'
        ? true
        : disposalStatusFilter === 'pending'
        ? item.status === 'menunggu_verifikasi'
        : item.status === disposalStatusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6" id="verification-center">
      {/* Header Banner */}
      <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1 text-xs font-black text-[#165DFF] mb-2">
            <ShieldCheck className="h-4 w-4" /> Pusat Persetujuan & Verifikasi
          </div>
          <h2 className="text-2xl font-black text-[#080C1A]">Verifikasi & Approval Sistem</h2>
          <p className="mt-1 text-xs text-[#6A7686]">
            Kelola persetujuan usulan penginputan data aset baru dari Operator Kampus dan usulan penghapusan BMN dari Satuan Kerja.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('asset')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'asset'
                ? 'bg-white text-[#165DFF] shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BadgeCheck className="h-4 w-4" />
            <span>Tab 1: Verifikasi Data Aset Baru</span>
            {pendingAssetsCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                {pendingAssetsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disposal')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'disposal'
                ? 'bg-white text-[#165DFF] shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>Tab 2: Verifikasi Usulan Penghapusan</span>
            {pendingDisposalsCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                {pendingDisposalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Verifikasi Data Aset Baru */}
      {activeTab === 'asset' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 flex items-center justify-between text-xs font-semibold text-sky-900">
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-[#165DFF]" />
              Menampilkan daftar aset baru dari Operator Kampus yang berstatus <strong>Menunggu Verifikasi</strong> ({pendingAssetsCount} aset).
            </span>
          </div>

          <AssetList
            assets={assets}
            currentRole={currentRole}
            currentUniversity={currentUniversity}
            onAssetsChange={onAssetsChange}
            defaultFilterStatus="menunggu_verifikasi"
          />
        </div>
      )}

      {/* Tab 2: Verifikasi Usulan Penghapusan */}
      {activeTab === 'disposal' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 flex items-center justify-between text-xs font-semibold text-amber-900">
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-600" />
              Menampilkan daftar usulan penghapusan BMN dari Satuan Kerja yang memerlukan verifikasi Admin ({pendingDisposalsCount} usulan pending).
            </span>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6A7686]" />
              <input
                type="text"
                value={disposalSearch}
                onChange={(e) => setDisposalSearch(e.target.value)}
                placeholder="Cari no. surat, jenis barang, satker..."
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-2 text-xs font-medium text-[#080C1A] outline-none focus:border-[#165DFF]"
              />
            </div>

            <select
              value={disposalStatusFilter}
              onChange={(e) => setDisposalStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2 text-xs font-semibold text-[#080C1A] outline-none focus:border-[#165DFF]"
            >
              <option value="pending">⏳ Khusus Perlu Verifikasi (Pending & Research)</option>
              <option value="all">🌐 Semua Status Usulan</option>
              <option value="menunggu_verifikasi">1. Menunggu Review</option>
              <option value="dalam_proses">2. Penelitian Tim BMN</option>
              <option value="disetujui">3. Disetujui (SK Terbit)</option>
              <option value="ditolak">Ditolak / Revisi</option>
            </select>
          </div>

          {/* Verification Table */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-bold uppercase tracking-wider text-[#6A7686]">
                  <tr>
                    <th className="px-5 py-4">No. Surat & Satker</th>
                    <th className="px-5 py-4">Rekapitulasi BMN</th>
                    <th className="px-5 py-4">Nilai Perolehan</th>
                    <th className="px-5 py-4">Status Usulan</th>
                    <th className="px-5 py-4 text-right">Aksi Verifikasi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loadingDisposals ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs font-semibold text-[#6A7686]">
                        Memuat data usulan verifikasi penghapusan BMN...
                      </td>
                    </tr>
                  ) : filteredDisposals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs font-semibold text-[#6A7686]">
                        Tidak ada usulan penghapusan BMN yang memerlukan verifikasi saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDisposals.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F9FAFB]/80 transition">
                        {/* Kolom 1: No. Surat & Satker */}
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-[#080C1A] text-sm">{item.no_surat_permohonan}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#165DFF]">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>[{extract6DigitKodeSatker(item.kode_satker)}] {item.nama_satker}</span>
                          </div>
                        </td>

                        {/* Kolom 2: Rekap BMN */}
                        <td className="px-5 py-4">
                          <strong className="text-[#080C1A] block">{item.jumlah_barang} Unit Barang</strong>
                          <span className="text-[11px] text-slate-500">{item.jenis_barang || 'BMN Umum'}</span>
                        </td>

                        {/* Kolom 3: Nilai Perolehan */}
                        <td className="px-5 py-4 font-extrabold text-emerald-600 text-sm">
                          {formatRupiah(Number(item.nilai_perolehan) || 0)}
                        </td>

                        {/* Kolom 4: Status */}
                        <td className="px-5 py-4">
                          {item.status === 'disetujui' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Disetujui (SK Terbit)
                            </span>
                          ) : item.status === 'ditolak' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700 border border-rose-200">
                              <X className="h-3.5 w-3.5" /> Ditolak / Perlu Revisi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700 border border-sky-200">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menunggu Verifikasi
                            </span>
                          )}
                        </td>

                        {/* Kolom 5: Aksi Verifikasi */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDisposal(item)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" /> Pratinjau Berkas
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateDisposalStatus(item.id, 'disetujui')}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                              title="Setujui Usulan Penghapusan"
                            >
                              <BadgeCheck className="h-3.5 w-3.5" /> Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const note = prompt('Masukkan alasan penolakan / perbaikan usulan:', item.catatan || '');
                                if (note !== null) {
                                  handleUpdateDisposalStatus(item.id, 'ditolak', note);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
                              title="Tolak / minta perbaikan"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rincian Proposal Modal */}
      {selectedDisposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#080C1A]">Detail Verifikasi Usulan Penghapusan</h3>
                <p className="text-xs text-[#6A7686]">Pratinjau 5 Berkas Dokumen & Kontrol Status Persetujuan</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDisposal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
              <div>
                <span className="text-[#6A7686] block text-[11px] uppercase font-bold">Nomor Surat Permohonan</span>
                <strong className="text-[#080C1A] text-sm">{selectedDisposal.no_surat_permohonan}</strong>
              </div>
              <div>
                <span className="text-[#6A7686] block text-[11px] uppercase font-bold">Satuan Kerja Pengaju</span>
                <strong className="text-[#165DFF]">[{selectedDisposal.kode_satker}] {selectedDisposal.nama_satker}</strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-sky-50/60 p-4 rounded-2xl border border-sky-100">
              <div>
                <span className="text-[#6A7686] block text-[11px]">Jumlah Barang</span>
                <strong className="text-sm font-black text-[#080C1A]">{selectedDisposal.jumlah_barang} Unit</strong>
              </div>
              <div>
                <span className="text-[#6A7686] block text-[11px]">Jenis Barang</span>
                <strong className="text-sm font-black text-[#080C1A]">{selectedDisposal.jenis_barang || '-'}</strong>
              </div>
              <div>
                <span className="text-[#6A7686] block text-[11px]">Nilai Perolehan</span>
                <strong className="text-sm font-black text-emerald-600">{formatRupiah(Number(selectedDisposal.nilai_perolehan) || 0)}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-extrabold text-[#080C1A] block">Unduh / Periksa 5 Dokumen Persyaratan:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDisposal.surat_permohonan_url && (
                  <a href={selectedDisposal.surat_permohonan_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                    <span>1. Surat Permohonan (PDF)</span> <Download className="h-4 w-4" />
                  </a>
                )}
                {selectedDisposal.sptjm_url && (
                  <a href={selectedDisposal.sptjm_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                    <span>2. Surat SPTJM (PDF)</span> <Download className="h-4 w-4" />
                  </a>
                )}
                {selectedDisposal.lampiran_url && (
                  <a href={selectedDisposal.lampiran_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between font-bold text-emerald-700 hover:bg-emerald-100">
                    <span>3. Lampiran Rekap BMN (.xlsx/.csv)</span> <Download className="h-4 w-4" />
                  </a>
                )}
                {selectedDisposal.sk_tim_url && (
                  <a href={selectedDisposal.sk_tim_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                    <span>4. SK Tim Internal (PDF)</span> <Download className="h-4 w-4" />
                  </a>
                )}
                {selectedDisposal.ba_penelitian_url && (
                  <a href={selectedDisposal.ba_penelitian_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                    <span>5. BA Penelitian BMN (PDF)</span> <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Action Control inside Modal */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Ubah Status Usulan:</span>
                <select
                  value={selectedDisposal.status || 'menunggu_verifikasi'}
                  onChange={(e) => handleUpdateDisposalStatus(selectedDisposal.id, e.target.value)}
                  className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#165DFF]"
                >
                  <option value="menunggu_verifikasi">1. Menunggu Review</option>
                  <option value="dalam_proses">2. Penelitian Tim BMN</option>
                  <option value="disetujui">3. Disetujui (SK Terbit)</option>
                  <option value="ditolak">Ditolak / Perlu Revisi</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDisposal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
