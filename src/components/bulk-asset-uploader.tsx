'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Laptop,
  RefreshCw,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';
import type { Asset, AssetType, UserRole } from '@/lib/types';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';

interface TemporaryAssetRow extends Omit<Partial<Asset>, 'asset_type'> {
  tempId: string;
  asset_type?: AssetType | 'equipment';
  acquisition_value?: number;
  acquisition_year?: number;
  targetSubMenu: 'bangunan_tanah' | 'alat_angkutan' | 'khusus_tik' | 'non_tik';
  targetSubMenuLabel: string;
  targetSubMenuHash: string;
  isValid: boolean;
  validationError?: string;
}

export function BulkAssetUploader({
  userRole,
  universityName,
  onUploadSuccess,
}: {
  userRole: UserRole;
  universityName: string | null;
  onUploadSuccess?: () => void;
}) {
  const [stagedRows, setStagedRows] = useState<TemporaryAssetRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ count: number } | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Helper for auto-categorization
  const determineTargetCategory = (jenis: string, type?: string) => {
    const text = `${jenis} ${type || ''}`.toLowerCase();

    if (text.includes('bangunan') || text.includes('tanah') || type === 'land' || type === 'building') {
      return {
        key: 'bangunan_tanah' as const,
        label: 'Sub-Menu Bangunan / Tanah',
        hash: '#asset-bangunan-tanah',
        asset_type: text.includes('tanah') ? ('land' as const) : ('building' as const),
      };
    }
    if (text.includes('angkut') || text.includes('mobil') || text.includes('motor') || text.includes('kendaraan')) {
      return {
        key: 'alat_angkutan' as const,
        label: 'Sub-Menu Alat Angkut Bermotor',
        hash: '#asset-alat-angkutan',
        category: 'alat_angkutan',
        asset_type: 'equipment' as const,
      };
    }
    if (text.includes('tik') || text.includes('komputer') || text.includes('server') || text.includes('laptop')) {
      return {
        key: 'khusus_tik' as const,
        label: 'Sub-Menu Mesin Khusus TIK',
        hash: '#asset-khusus-tik',
        category: 'khusus_tik',
        asset_type: 'equipment' as const,
      };
    }
    return {
      key: 'non_tik' as const,
      label: 'Sub-Menu Mesin Non TIK',
      hash: '#asset-non-tik',
      category: 'non_tik',
      asset_type: 'equipment' as const,
    };
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama / Merk Barang': 'Gedung Rektorat Utama PTN',
        'Jenis / Kategori Barang': 'Bangunan',
        'Kode Barang': '3010101001',
        NUP: '000001',
        'Kode Satker': '0230101001',
        'Nama Satker': 'Universitas Indonesia',
        'Luas (m2)': 4500,
        Alamat: 'Jl. Margonda Raya No. 1, Depok',
        'Status Sertifikasi': 'Sertifikat Hak Pakai',
        'Nilai Perolehan (Rp)': 25000000000,
        'Tahun Perolehan': 2018,
        Latitude: -6.3645,
        Longitude: 106.8286,
      },
      {
        'Nama / Merk Barang': 'Toyota Innova Zenix Hybrid',
        'Jenis / Kategori Barang': 'Alat Angkut Bermotor',
        'Kode Barang': '3020101002',
        NUP: '000002',
        'Kode Satker': '0230101001',
        'Nama Satker': 'Universitas Indonesia',
        'Luas (m2)': 0,
        Alamat: 'Gedung Rektorat Lt. 1',
        'Status Sertifikasi': 'BPKB Resmi',
        'Nilai Perolehan (Rp)': 485000000,
        'Tahun Perolehan': 2023,
        Latitude: null,
        Longitude: null,
      },
      {
        'Nama / Merk Barang': 'Server High Performance Dell PowerEdge R750',
        'Jenis / Kategori Barang': 'Mesin Khusus TIK',
        'Kode Barang': '3050101003',
        NUP: '000003',
        'Kode Satker': '0230101001',
        'Nama Satker': 'Universitas Indonesia',
        'Luas (m2)': 0,
        Alamat: 'Data Center PUSTIPANDA',
        'Status Sertifikasi': 'Aset Lancar TIK',
        'Nilai Perolehan (Rp)': 185000000,
        'Tahun Perolehan': 2024,
        Latitude: null,
        Longitude: null,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Unggah Aset');
    XLSX.writeFile(wb, 'Format_Template_Unggah_Aset_Kemdiktisaintek.xlsx');
  };

  // Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSubmitSuccess(null);
    setFormatError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!data || data.length === 0) {
          setFormatError('Berkas Excel kosong atau tidak memiliki baris data. Silakan gunakan format template yang disediakan.');
          setStagedRows([]);
          return;
        }

        // Validate mandatory columns in the first row
        const firstRow = data[0];
        const keys = Object.keys(firstRow).map((k) => k.toLowerCase());
        const hasValidColumn = keys.some((k) =>
          k.includes('nama') || k.includes('merk') || k.includes('barang') || k.includes('jenis') || k.includes('kode')
        );

        if (!hasValidColumn) {
          setFormatError(
            "Format berkas Excel tidak sesuai template! Kolom utama seperti 'Nama / Merk Barang' atau 'Jenis / Kategori Barang' tidak ditemukan. Silakan unduh Format Template Excel resmi yang telah disediakan di atas."
          );
          setStagedRows([]);
          return;
        }

        const parsed: TemporaryAssetRow[] = data.map((row, idx) => {
          const nama = row['Nama / Merk Barang'] || row['Nama Barang'] || row['Merk'] || row['nama_barang'] || `Aset Excel #${idx + 1}`;
          const jenis = String(row['Jenis / Kategori Barang'] || row['Jenis Barang'] || row['jenis_barang'] || 'Bangunan');
          const type = row['Type'] || row['asset_type'];

          const categoryMapping = determineTargetCategory(jenis, type);

          const isRowValid = Boolean(nama && String(nama).trim());

          return {
            tempId: `TMP-${Date.now()}-${idx}`,
            nama_barang: String(nama),
            merk: String(row['Merk'] || nama),
            asset_type: categoryMapping.asset_type,
            category: (categoryMapping as any).category || undefined,
            kode_barang: String(row['Kode Barang'] || row['kode_barang'] || ''),
            nup: String(row['NUP'] || row['nup'] || ''),
            kode_satker: String(row['Kode Satker'] || row['kode_satker'] || ''),
            nama_satker: String(row['Nama Satker'] || row['nama_satker'] || universityName || ''),
            campus_name: universityName || String(row['Nama Satker'] || 'Portofolio Kemdiktisaintek'),
            luas_m2: Number(row['Luas (m2)'] || row['luas_m2'] || row['Luas Bangunan']) || 0,
            address: String(row['Alamat'] || row['address'] || ''),
            certification_status: String(row['Status Sertifikasi'] || row['certification_status'] || 'Sertifikat'),
            acquisition_value: Number(row['Nilai Perolehan (Rp)'] || row['nilai_perolehan'] || row['acquisition_value']) || 0,
            acquisition_year: Number(row['Tahun Perolehan'] || row['acquisition_year']) || new Date().getFullYear(),
            latitude: row['Latitude'] ? Number(row['Latitude']) : null,
            longitude: row['Longitude'] ? Number(row['Longitude']) : null,
            targetSubMenu: categoryMapping.key,
            targetSubMenuLabel: categoryMapping.label,
            targetSubMenuHash: categoryMapping.hash,
            isValid: isRowValid,
            validationError: isRowValid ? undefined : 'Nama/Merk barang wajib diisi',
          };
        });

        setStagedRows(parsed);
      } catch (err: any) {
        alert('Gagal membaca berkas Excel. Pastikan format sesuai template.');
        console.error('File parse error:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleRemoveRow = (tempId: string) => {
    setStagedRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  // Submit Temporary Staged Rows to DB
  const handleSubmitToDatabase = async () => {
    if (stagedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: stagedRows }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menyimpan data ke database');
      }

      const json = await res.json();
      setSubmitSuccess({ count: json.count || stagedRows.length });
      setStagedRows([]);
      setFileName('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal submit data temporary ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Counts per Sub-Menu Target
  const targetCounts = {
    bangunan_tanah: stagedRows.filter((r) => r.targetSubMenu === 'bangunan_tanah').length,
    alat_angkutan: stagedRows.filter((r) => r.targetSubMenu === 'alat_angkutan').length,
    khusus_tik: stagedRows.filter((r) => r.targetSubMenu === 'khusus_tik').length,
    non_tik: stagedRows.filter((r) => r.targetSubMenu === 'non_tik').length,
  };

  return (
    <div className="space-y-6" id="bulk-asset-uploader">
      {/* Header Banner */}
      <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1 text-xs font-black text-[#165DFF] mb-2">
            <UploadCloud className="h-4 w-4" /> Unggah Data Massal Excel
          </div>
          <h2 className="text-2xl font-black text-[#080C1A]">Unggah Data Aset Satuan Kerja</h2>
          <p className="mt-1 text-xs text-[#6A7686]">
            Unggah file Excel data aset. Data akan disimpan di <strong>Tabel Temporary (Staging)</strong> terlebih dahulu untuk Anda tinjau sebelum dikomit ke database.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#165DFF] px-4 py-3 text-xs font-bold text-white shadow-md shadow-[#165DFF]/20 hover:bg-blue-600 transition cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4" /> Unduh Template Excel (.xlsx)
        </button>
      </div>

      {/* File Dropzone */}
      <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-8 text-center transition hover:border-[#165DFF] hover:bg-sky-50/80">
        <input
          type="file"
          id="excel-upload-input"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <label htmlFor="excel-upload-input" className="cursor-pointer space-y-3 block">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md text-[#165DFF] border border-sky-100">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-[#080C1A]">Klik di sini untuk memilih berkas Excel</span>
            <p className="text-xs text-[#6A7686] mt-0.5">Mendukung format .xlsx, .xls, dan .csv</p>
          </div>
          {fileName && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Berkas terpilih: {fileName}
            </div>
          )}
        </label>
      </div>

      {/* Format Validation Error Banner */}
      {formatError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold text-rose-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black text-rose-950 text-sm">Format Excel Tidak Sesuai!</strong>
              <p className="mt-0.5 text-rose-800 leading-relaxed">{formatError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Unduh Template Resmi
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {submitSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between text-xs font-bold text-emerald-900">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Berhasil menyimpan <strong>{submitSuccess.count} data aset</strong> dari tabel temporary ke database! Data otomatis terbagi ke sub-menu terkait.
          </span>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Temporary Staging Table Section */}
      {stagedRows.length > 0 && (
        <div className="space-y-4">
          {/* Target Sub-Menu Mapping Summary Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#080C1A]">
                🎯 Auto-Mapping Target Sub-Menu ({stagedRows.length} Baris Temporary):
              </h4>
              <button
                type="button"
                onClick={() => setStagedRows([])}
                className="text-xs text-rose-600 font-bold hover:underline"
              >
                Kosongkan Tabel Temporary
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 font-semibold text-sky-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-sky-600" /> Bangunan / Tanah:
                </span>
                <strong className="text-sm font-black">{targetCounts.bangunan_tanah}</strong>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 font-semibold text-indigo-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-indigo-600" /> Alat Angkut:
                </span>
                <strong className="text-sm font-black">{targetCounts.alat_angkutan}</strong>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 font-semibold text-purple-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Laptop className="h-4 w-4 text-purple-600" /> Mesin TIK:
                </span>
                <strong className="text-sm font-black">{targetCounts.khusus_tik}</strong>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 font-semibold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-slate-600" /> Mesin Non TIK:
                </span>
                <strong className="text-sm font-black">{targetCounts.non_tik}</strong>
              </div>
            </div>
          </div>

          {/* Staging Table */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-bold uppercase tracking-wider text-[#6A7686]">
                  <tr>
                    <th className="px-4 py-3.5">Nama / Merk Barang</th>
                    <th className="px-4 py-3.5">Target Sub-Menu</th>
                    <th className="px-4 py-3.5">Kode & NUP</th>
                    <th className="px-4 py-3.5">Nilai & Tahun</th>
                    <th className="px-4 py-3.5">Satker</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {stagedRows.map((row) => (
                    <tr key={row.tempId} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-[#080C1A]">{row.nama_barang}</div>
                        <div className="text-[11px] text-slate-500">{row.address || 'Tanpa Alamat'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <a
                          href={row.targetSubMenuHash}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-1 text-[11px] font-extrabold text-[#165DFF]"
                        >
                          {row.targetSubMenuLabel} <ChevronRight className="h-3 w-3" />
                        </a>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{row.kode_barang || '-'}</div>
                        <div className="text-[11px] text-slate-500">NUP: {row.nup || '-'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-emerald-600">
                          Rp {(row.acquisition_value || 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] text-slate-500">Tahun {row.acquisition_year}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-700">{row.nama_satker}</div>
                        <div className="text-[11px] text-slate-500">[{extract6DigitKodeSatker(row.kode_satker || '')}]</div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.tempId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Hapus dari temporary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action Control */}
          <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-extrabold text-[#080C1A]">Sudah Yakin dengan Data Temporary di Atas?</h4>
              <p className="text-xs text-[#6A7686] mt-0.5">
                Klik tombol submit untuk menyimpan <strong>{stagedRows.length} data aset temporary</strong> ini secara permanen ke database portal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmitToDatabase}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Menyimpan ke Database...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Submit Data Aset ke Database →
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
