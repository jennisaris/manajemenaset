'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Building2,
  CheckCircle2,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import { SatkerAutocompleteInput } from '@/components/satker-autocomplete-input';
import type { BmnDisposalProposal, UserRole } from '@/lib/types';

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

type BmnDisposalManagerProps = {
  currentRole: UserRole;
  universityName?: string | null;
  kodeSatker?: string | null;
};

export function BmnDisposalManager({
  currentRole,
  universityName,
  kodeSatker,
}: BmnDisposalManagerProps) {
  const isOperator = currentRole === 'Operator Kampus';

  const [proposals, setProposals] = useState<BmnDisposalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSatkerFilter, setSelectedSatkerFilter] = useState('');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [formSatker, setFormSatker] = useState(isOperator ? `${kodeSatker || ''} - ${universityName || ''}` : '');
  const [formKodeSatker, setFormKodeSatker] = useState(kodeSatker || '');
  const [formNamaSatker, setFormNamaSatker] = useState(universityName || '');
  const [noSurat, setNoSurat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [jumlahBarang, setJumlahBarang] = useState('');
  const [jenisBarang, setJenisBarang] = useState('');
  const [nilaiPerolehan, setNilaiPerolehan] = useState('');

  // Form File State
  const [fileSurat, setFileSurat] = useState<File | null>(null);
  const [fileSptjm, setFileSptjm] = useState<File | null>(null);
  const [fileLampiran, setFileLampiran] = useState<File | null>(null);
  const [fileSkTim, setFileSkTim] = useState<File | null>(null);
  const [fileBaPenelitian, setFileBaPenelitian] = useState<File | null>(null);

  // Detail Modal State
  const [selectedProposal, setSelectedProposal] = useState<BmnDisposalProposal | null>(null);

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch('/api/disposals');
      if (res.ok) {
        const json = await res.json();
        setProposals(json.proposals || []);
      }
    } catch (err) {
      console.error('Gagal memuat usulan penghapusan BMN:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProposals();
  }, []);

  function resetForm() {
    setNoSurat('');
    setCatatan('');
    setJumlahBarang('');
    setJenisBarang('');
    setNilaiPerolehan('');
    setFileSurat(null);
    setFileSptjm(null);
    setFileLampiran(null);
    setFileSkTim(null);
    setFileBaPenelitian(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (!isOperator) {
      setFormSatker('');
      setFormKodeSatker('');
      setFormNamaSatker('');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!noSurat.trim()) {
      setErrorMsg('Nomor Surat Permohonan wajib diisi.');
      return;
    }

    const finalKodeSatker = formKodeSatker || formSatker.match(/^(\d{6})/)?.[1] || (isOperator ? kodeSatker : '');
    const finalNamaSatker = formNamaSatker || formSatker.replace(/^(\d{6})\s*-\s*/, '').trim() || (isOperator ? universityName : '');

    if (!finalKodeSatker || !finalNamaSatker) {
      setErrorMsg('Satuan Kerja / Perguruan Tinggi wajib dipilih terlebih dahulu.');
      return;
    }

    if (!fileSurat || !fileSptjm || !fileLampiran || !fileSkTim || !fileBaPenelitian) {
      setErrorMsg('Semua 5 berkas dokumen usulan penghapusan BMN wajib diunggah.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('no_surat_permohonan', noSurat.trim());
      formData.append('kode_satker', finalKodeSatker);
      formData.append('nama_satker', finalNamaSatker);
      if (catatan.trim()) formData.append('catatan', catatan.trim());
      if (jumlahBarang) formData.append('jumlah_barang', jumlahBarang);
      if (jenisBarang) formData.append('jenis_barang', jenisBarang.trim());
      if (nilaiPerolehan) formData.append('nilai_perolehan', nilaiPerolehan);

      formData.append('surat_permohonan', fileSurat);
      formData.append('sptjm', fileSptjm);
      formData.append('lampiran', fileLampiran);
      formData.append('sk_tim', fileSkTim);
      formData.append('ba_penelitian', fileBaPenelitian);

      const res = await fetch('/api/disposals', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengajukan usulan penghapusan.');
      }

      setSuccessMsg('Usulan Penghapusan BMN berhasil diajukan!');
      fetchProposals();
      setTimeout(() => {
        setIsFormOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengajukan usulan.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number, noSurat: string) {
    if (!confirm(`Hapus usulan penghapusan BMN Nomor Surat: ${noSurat}?`)) return;
    try {
      const res = await fetch(`/api/disposals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProposals();
      }
    } catch (err) {
      console.error('Gagal menghapus usulan:', err);
    }
  }

  const filteredProposals = useMemo(() => {
    return proposals.filter((item) => {
      const matchSearch =
        item.no_surat_permohonan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nama_satker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_satker.includes(searchTerm) ||
        (item.jenis_barang && item.jenis_barang.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSatker = !selectedSatkerFilter || item.kode_satker === selectedSatkerFilter;

      return matchSearch && matchSatker;
    });
  }, [proposals, searchTerm, selectedSatkerFilter]);

  // Total Calculations
  const totalUsulan = filteredProposals.length;
  const totalJumlahBarang = filteredProposals.reduce((sum, item) => sum + (item.jumlah_barang || 0), 0);
  const totalNilaiPerolehan = filteredProposals.reduce((sum, item) => sum + (Number(item.nilai_perolehan) || 0), 0);

  if (isFormOpen) {
    return (
      <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="disposal-form">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              ← Kembali ke Daftar Usulan Penghapusan
            </button>
            <h3 className="text-xl font-bold text-foreground">Tambah Usulan Penghapusan BMN Baru</h3>
            <p className="mt-0.5 text-xs text-secondary">Lengkapi surat permohonan, dokumen SPTJM, lampiran rekap BMN, SK tim, dan BA penelitian.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-gray-50 text-secondary hover:bg-muted transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-success-dark">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-foreground">{successMsg}</h4>
            <p className="text-xs text-secondary">Usulan penghapusan BMN telah berhasil tercatat di sistem.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="rounded-2xl bg-error-light p-4 text-xs font-bold text-error-dark border border-error-light">
                {errorMsg}
              </div>
            )}

            {/* Grid Satker & No Surat */}
            <div className="grid gap-4 md:grid-cols-2">
              {!isOperator ? (
                <div className="grid gap-1.5 text-xs font-medium text-foreground">
                  <SatkerAutocompleteInput
                    label="Satuan Kerja / Perguruan Tinggi (Satker)"
                    placeholder="Admin Wajib memilih Satker Pengaju (contoh: 693441 - UNIVERSITAS ANDALAS)..."
                    value={formSatker}
                    onChange={(val, selected) => {
                      setFormSatker(val);
                      if (selected) {
                        setFormKodeSatker(selected.kode_satker);
                        setFormNamaSatker(selected.nama_satker);
                      }
                    }}
                    required
                  />
                </div>
              ) : (
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Satuan Kerja / Perguruan Tinggi
                  <input
                    type="text"
                    disabled
                    value={`[${kodeSatker || ''}] ${universityName || ''}`}
                    className="rounded-2xl border border-border bg-gray-50 px-4 py-2.5 text-xs font-medium text-foreground"
                  />
                </label>
              )}

              <label className="grid gap-1.5 text-xs font-medium text-foreground">
                Nomor Surat Permohonan <span className="text-error">*</span>
                <input
                  type="text"
                  required
                  value={noSurat}
                  onChange={(e) => setNoSurat(e.target.value)}
                  placeholder="Contoh: 1234/UN.16/PL/2026"
                  className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
                />
              </label>
            </div>

            {/* 5 Required File Upload Cards */}
            <div className="space-y-3">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Upload 5 Dokumen Persyaratan Penghapusan BMN:</h5>

              {/* 1. Surat Permohonan */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">1. Surat Permohonan (.pdf) <span className="text-error">*</span></h5>
                      <p className="mt-0.5 text-xs text-secondary">File PDF resmi permohonan penghapusan dari Perguruan Tinggi.</p>
                      {fileSurat && <p className="mt-1 text-xs font-semibold text-primary">{fileSurat.name}</p>}
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition shrink-0">
                    <UploadCloud className="h-4 w-4" />
                    Pilih PDF
                    <input type="file" required accept=".pdf,application/pdf" onChange={(e) => setFileSurat(e.target.files?.[0] || null)} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* 2. Surat Pernyataan Tanggung Jawab / SPTJM */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">2. Surat Pernyataan Tanggung Jawab / SPTJM (.pdf) <span className="text-error">*</span></h5>
                      <p className="mt-0.5 text-xs text-secondary">Surat pertanggungjawaban mutlak kebenaran data BMN.</p>
                      {fileSptjm && <p className="mt-1 text-xs font-semibold text-primary">{fileSptjm.name}</p>}
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition shrink-0">
                    <UploadCloud className="h-4 w-4" />
                    Pilih PDF
                    <input type="file" required accept=".pdf,application/pdf" onChange={(e) => setFileSptjm(e.target.files?.[0] || null)} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* 3. Dokumen Lampiran (.xlsx / .csv) */}
              <div className="rounded-2xl border border-success-light bg-success-light/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-light text-success-dark shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">3. Dokumen Lampiran Rincian BMN (.xlsx / .csv) <span className="text-error">*</span></h5>
                      <p className="mt-0.5 text-xs text-secondary">Otomatis direkapitulasi sistem: Jumlah barang, jenis barang, & total nilai perolehan.</p>
                      {fileLampiran && <p className="mt-1 text-xs font-semibold text-success-dark">{fileLampiran.name}</p>}
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-success-light px-4 py-2 text-xs font-semibold text-success-dark hover:bg-success-light/80 transition shrink-0">
                    <UploadCloud className="h-4 w-4" />
                    Pilih XLSX/CSV
                    <input type="file" required accept=".xlsx,.xls,.csv" onChange={(e) => setFileLampiran(e.target.files?.[0] || null)} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* 4. SK Pembentukan Tim Internal */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">4. SK Pembentukan Tim Internal (.pdf) <span className="text-error">*</span></h5>
                      <p className="mt-0.5 text-xs text-secondary">Surat Keputusan penetapan tim penilai & penguji BMN.</p>
                      {fileSkTim && <p className="mt-1 text-xs font-semibold text-primary">{fileSkTim.name}</p>}
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition shrink-0">
                    <UploadCloud className="h-4 w-4" />
                    Pilih PDF
                    <input type="file" required accept=".pdf,application/pdf" onChange={(e) => setFileSkTim(e.target.files?.[0] || null)} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* 5. Berita Acara Penelitian & Pemeriksaan BMN */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">5. Berita Acara Penelitian & Pemeriksaan BMN (.pdf) <span className="text-error">*</span></h5>
                      <p className="mt-0.5 text-xs text-secondary">Berita acara hasil verifikasi fisik dan kelayakan barang.</p>
                      {fileBaPenelitian && <p className="mt-1 text-xs font-semibold text-primary">{fileBaPenelitian.name}</p>}
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition shrink-0">
                    <UploadCloud className="h-4 w-4" />
                    Pilih PDF
                    <input type="file" required accept=".pdf,application/pdf" onChange={(e) => setFileBaPenelitian(e.target.files?.[0] || null)} className="sr-only" />
                  </label>
                </div>
              </div>
            </div>

            {/* Manual Rekapitulasi Override Fields */}
            <div className="rounded-2xl border border-border bg-gray-50/70 p-4">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Hasil Rekapitulasi Manual / Override:</h5>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Jumlah Barang (Unit)
                  <input
                    type="number"
                    value={jumlahBarang}
                    onChange={(e) => setJumlahBarang(e.target.value)}
                    placeholder="Otomatis / Isi Manual"
                    className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Jenis Barang BMN
                  <input
                    type="text"
                    value={jenisBarang}
                    onChange={(e) => setJenisBarang(e.target.value)}
                    placeholder="Contoh: Peralatan TIK, Kendaraan"
                    className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Nilai Perolehan (Rp)
                  <input
                    type="number"
                    value={nilaiPerolehan}
                    onChange={(e) => setNilaiPerolehan(e.target.value)}
                    placeholder="Contoh: 150000000"
                    className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
                  />
                </label>
              </div>
            </div>

            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Catatan / Alasan Penghapusan
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tuliskan keterangan tambahan atau pertimbangan penghapusan BMN..."
                className="rounded-2xl border border-border bg-white p-3 text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
              />
            </label>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-button border border-border bg-white px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-muted transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? 'Mengirim Usulan...' : 'Kirim Usulan Penghapusan'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" id="disposal-manager">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 mb-2">
            <Archive className="h-4 w-4" /> Management BMN - Usulan Penghapusan
          </div>
          <h2 className="text-2xl font-black text-[#080C1A]">Penghapusan Barang Milik Negara</h2>
          <p className="mt-1 text-xs text-[#6A7686]">
            {isOperator
              ? `Pengajuan usulan penghapusan BMN untuk Satker ${universityName || ''} [${kodeSatker || ''}]`
              : 'Daftar usulan penghapusan BMN seluruh Satuan Kerja / Perguruan Tinggi'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#165DFF] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#165DFF]/20 hover:bg-[#0E4BD9] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Usulan Penghapusan Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#6A7686] uppercase tracking-wider block">Total Usulan</span>
            <strong className="text-2xl font-black text-[#080C1A] mt-1 block">{totalUsulan} </strong>
            <span className="text-[11px] text-[#6A7686]">Usulan penghapusan terdaftar</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#6A7686] uppercase tracking-wider block">Jumlah Barang Diusulkan</span>
            <strong className="text-2xl font-black text-[#165DFF] mt-1 block">{totalJumlahBarang.toLocaleString('id-ID')} </strong>
            <span className="text-[11px] text-[#6A7686]">Hasil rekapitulasi lampiran BMN</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-[#165DFF] flex items-center justify-center shrink-0">
            <Archive className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#6A7686] uppercase tracking-wider block">Nilai Perolehan Diusulkan</span>
            <strong className="text-xl font-black text-emerald-600 mt-1 block">{formatRupiah(totalNilaiPerolehan)}</strong>
            <span className="text-[11px] text-[#6A7686]">Total estimasi nilai buku BMN</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6A7686]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari no. surat, jenis barang, atau satker..."
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-2 text-xs font-medium text-[#080C1A] outline-none focus:border-[#165DFF]"
          />
        </div>

        {!isOperator && (
          <div className="w-full sm:w-72">
            <SatkerAutocompleteInput
              value={selectedSatkerFilter}
              onChange={(val, selected) => setSelectedSatkerFilter(selected?.kode_satker || val.match(/^(\d{6})/)?.[1] || '')}
              placeholder="Filter per Satker..."
              compact
            />
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-bold uppercase tracking-wider text-[#6A7686]">
              <tr>
                <th className="px-5 py-4">No. Surat & Satker</th>
                <th className="px-5 py-4">Rekapitulasi Usulan BMN</th>
                <th className="px-5 py-4">Dokumen Wajib (PDF/Excel)</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs font-semibold text-[#6A7686]">
                    Memuat data usulan penghapusan BMN...
                  </td>
                </tr>
              ) : filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs font-semibold text-[#6A7686]">
                    Belum ada usulan penghapusan BMN yang diajukan.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB]/80 transition">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-[#080C1A]">{item.no_surat_permohonan}</div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#165DFF]">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>[{item.kode_satker}] {item.nama_satker}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#080C1A]">{item.jumlah_barang} Item ({item.jenis_barang || 'BMN Umum'})</div>
                        <div className="text-[11px] font-extrabold text-emerald-600">Nilai: {formatRupiah(Number(item.nilai_perolehan) || 0)}</div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {item.surat_permohonan_url && (
                          <a
                            href={item.surat_permohonan_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition"
                            title="Surat Permohonan (PDF)"
                          >
                            <FileText className="h-3 w-3" /> Surat
                          </a>
                        )}
                        {item.sptjm_url && (
                          <a
                            href={item.sptjm_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition"
                            title="SPTJM (PDF)"
                          >
                            <FileCheck className="h-3 w-3" /> SPTJM
                          </a>
                        )}
                        {item.lampiran_url && (
                          <a
                            href={item.lampiran_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            title="Lampiran Rekap BMN (.xlsx / .csv)"
                          >
                            <FileSpreadsheet className="h-3 w-3" /> Lampiran
                          </a>
                        )}
                        {item.sk_tim_url && (
                          <a
                            href={item.sk_tim_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition"
                            title="SK Tim Internal (PDF)"
                          >
                            <FileText className="h-3 w-3" /> SK Tim
                          </a>
                        )}
                        {item.ba_penelitian_url && (
                          <a
                            href={item.ba_penelitian_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition"
                            title="Berita Acara Penelitian (PDF)"
                          >
                            <FileText className="h-3 w-3" /> BA Research
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                        {item.status.replaceAll('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProposal(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60 hover:bg-[#165DFF] hover:text-white transition"
                          title="Lihat Rincian Usulan"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.no_surat_permohonan)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60 hover:bg-rose-600 hover:text-white transition"
                          title="Hapus Usulan"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Rincian Proposal Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#080C1A]">Detail Usulan Penghapusan BMN</h3>
                <p className="text-xs text-[#6A7686]">Rincian berkas dan rekapitulasi data usulan</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[#6A7686] block text-[11px] uppercase font-bold">Nomor Surat</span>
                  <strong className="text-[#080C1A] text-sm">{selectedProposal.no_surat_permohonan}</strong>
                </div>
                <div>
                  <span className="text-[#6A7686] block text-[11px] uppercase font-bold">Satuan Kerja</span>
                  <strong className="text-[#165DFF]">[{selectedProposal.kode_satker}] {selectedProposal.nama_satker}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-sky-50/60 p-4 rounded-2xl border border-sky-100">
                <div>
                  <span className="text-[#6A7686] block text-[11px]">Jumlah Barang</span>
                  <strong className="text-sm font-black text-[#080C1A]">{selectedProposal.jumlah_barang} Unit</strong>
                </div>
                <div>
                  <span className="text-[#6A7686] block text-[11px]">Jenis Barang</span>
                  <strong className="text-sm font-black text-[#080C1A]">{selectedProposal.jenis_barang || '-'}</strong>
                </div>
                <div>
                  <span className="text-[#6A7686] block text-[11px]">Nilai Perolehan</span>
                  <strong className="text-sm font-black text-emerald-600">{formatRupiah(Number(selectedProposal.nilai_perolehan) || 0)}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-[#080C1A] block">Berkas Dokumen Terlampir:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedProposal.surat_permohonan_url && (
                    <a href={selectedProposal.surat_permohonan_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                      <span>Surat Permohonan</span> <Download className="h-4 w-4" />
                    </a>
                  )}
                  {selectedProposal.sptjm_url && (
                    <a href={selectedProposal.sptjm_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                      <span>Surat SPTJM</span> <Download className="h-4 w-4" />
                    </a>
                  )}
                  {selectedProposal.lampiran_url && (
                    <a href={selectedProposal.lampiran_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between font-bold text-emerald-700 hover:bg-emerald-100">
                      <span>Lampiran Rekap (.xlsx/.csv)</span> <Download className="h-4 w-4" />
                    </a>
                  )}
                  {selectedProposal.sk_tim_url && (
                    <a href={selectedProposal.sk_tim_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                      <span>SK Tim Internal</span> <Download className="h-4 w-4" />
                    </a>
                  )}
                  {selectedProposal.ba_penelitian_url && (
                    <a href={selectedProposal.ba_penelitian_url} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 flex items-center justify-between font-bold text-sky-700 hover:bg-sky-50">
                      <span>BA Penelitian BMN</span> <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {selectedProposal.catatan && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <strong className="block text-[11px] uppercase">Catatan:</strong>
                  <span>{selectedProposal.catatan}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
