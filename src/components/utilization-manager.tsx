'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Copy, ExternalLink, Eye, FileText, MapPinned, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { deleteUtilization, persistUtilization } from '@/lib/utilization-crud';
import { createAssetDocumentPreviewUrl, uploadUtilizationPks, uploadUtilizationPhoto } from '@/lib/storage';
import type { Asset, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';
import { formatDateForInput, formatDateRangeIndo } from '@/lib/date-utils';
import { getAssetDisplayName } from '@/lib/satker-utils';
import { AssetAutocompleteInput } from './asset-autocomplete-input';
import { ImageSlideshow, SlideshowItem } from './assets/image-slideshow';

const UtilizationAreaMap = dynamic(() => import('./utilization-area-map').then((mod) => mod.UtilizationAreaMap), {
  ssr: false,
  loading: () => <div className="grid h-[320px] place-items-center rounded-3xl bg-sky-50 text-sm font-bold text-sky-700">Memuat peta area pemanfaatan...</div>,
});

type UtilizationManagerProps = {
  assets: Asset[];
  utilizations: Utilization[];
  canManage: boolean;
  onUtilizationsChange: (utilizations: Utilization[]) => void;
};

export const utilizationTypeOptions = [
  { value: 'sewa', label: 'Sewa' },
  { value: 'pinjam_pakai', label: 'Pinjam Pakai' },
  { value: 'ksp', label: 'Kerja Sama Pemanfaatan (KSP)' },
  { value: 'bgs_bsg', label: 'Bangun Guna Serah (BGS) / Bangun Serah Guna (BSG)' },
  { value: 'ketupi', label: 'Kerja Sama Terbatas Untuk Pembiayaan Infrastruktur (KETUPI)' },
];

export function getUtilizationTypeLabel(typeValue: string): string {
  const match = utilizationTypeOptions.find(
    (opt) => opt.value === typeValue || opt.label.toLowerCase() === typeValue.toLowerCase()
  );
  if (match) return match.label;
  if (typeValue === 'kerja_sama') return 'Kerja Sama Pemanfaatan (KSP)';
  return typeValue.replaceAll('_', ' ');
}

export function calculateAutomaticStatus(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return 'aktif';
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  if (now > end) return 'berakhir';

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (end.getTime() - now.getTime() <= thirtyDaysMs && now >= start) {
    return 'akan_berakhir';
  }

  if (now < start) return 'menunggu_verifikasi';

  return 'aktif';
}

const statusOptions = ['draft', 'menunggu_verifikasi', 'aktif', 'akan_berakhir', 'berakhir', 'dibatalkan'];

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'akan_berakhir'
      ? 'bg-warning-light text-warning-dark font-semibold'
      : status === 'aktif'
      ? 'bg-info-light text-primary font-semibold'
      : status === 'berakhir'
      ? 'bg-card-grey text-gray-600 font-semibold'
      : 'bg-success-light text-success-dark font-semibold';
  return <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>{status.replaceAll('_', ' ')}</span>;
}

function emptyUtilization(nextId: number, assetId: number): Utilization {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10);
  return {
    id: nextId,
    asset_id: assetId,
    third_party_name: '',
    utilization_type: 'sewa',
    start_date: startDate,
    end_date: endDate,
    status: calculateAutomaticStatus(startDate, endDate),
    utilized_area_m2: null,
    geometry_geojson: null,
    use_full_asset_area: false,
  };
}

export function UtilizationManager({ assets, utilizations, canManage, onUtilizationsChange }: UtilizationManagerProps) {
  const [items, setItems] = useState(utilizations);

  useEffect(() => {
    setItems(utilizations);
  }, [utilizations]);
  const [draft, setDraft] = useState<Utilization | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Mode database aktif: pemanfaatan akan disimpan ke PostgreSQL lokal.' : 'Mode demo: pemanfaatan tersimpan lokal sampai env PostgreSQL lokal diisi.');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pksFile, setPksFile] = useState<File | null>(null);
  const [pksPreviewUrl, setPksPreviewUrl] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<Utilization | null>(null);

  const assetOptions = useMemo(() => assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} — ${getAssetDisplayName(asset)}` })), [assets]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  function openCreate() {
    if (!canManage || assetOptions.length === 0) return;
    setDraft(emptyUtilization(Math.max(0, ...items.map((item) => item.id)) + 1, assetOptions[0].id));
    setPksFile(null);
    setPksPreviewUrl(null);
    setPhotoFiles([]);
    setPhotoPreviewUrls([]);
    setFormOpen(true);
    setMessage(isSupabaseConfigured ? 'Pemanfaatan baru akan ditulis ke asset_utilizations.' : 'Mode demo: pemanfaatan baru tersimpan lokal.');
  }

  function openUtilizationMap(item: Utilization) {
    window.open(`/map?assetId=${item.asset_id}&utilizationId=${item.id}`, '_blank', 'noopener,noreferrer');
  }

  function openEdit(item: Utilization) {
    if (!canManage) return;
    setDraft({
      ...item,
      start_date: formatDateForInput(item.start_date),
      end_date: formatDateForInput(item.end_date),
    });
    setPksFile(null);
    setPksPreviewUrl(null);
    setPhotoFiles([]);
    setPhotoPreviewUrls([]);
    setFormOpen(true);
    setMessage(isSupabaseConfigured ? 'Perubahan pemanfaatan akan ditulis ke asset_utilizations.' : 'Mode demo: perubahan tersimpan lokal.');
  }

  function updateDraft(patch: Partial<Utilization>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function closeForm() {
    setDraft(null);
    setFormOpen(false);
    setIsSaving(false);
  }

  function copyPhotosFromMasterAsset() {
    if (!draft) return;
    const currentAsset = assetById.get(draft.asset_id);
    if (!currentAsset) return;

    const masterUrls = currentAsset.photo_urls ?? (currentAsset.primary_photo_url ? [currentAsset.primary_photo_url] : []);
    const masterPaths = currentAsset.photo_paths ?? (currentAsset.primary_photo_path ? [currentAsset.primary_photo_path] : []);
    const masterNames = currentAsset.photo_names ?? masterUrls.map((_, i) => `Foto Master Aset ${i + 1}`);

    if (masterUrls.length === 0 && !currentAsset.primary_photo_url) {
      setMessage('Master aset ini belum memiliki foto di database.');
      return;
    }

    const existingUrls = draft.photo_urls ?? [];
    const existingPaths = draft.photo_paths ?? [];
    const existingNames = draft.photo_names ?? [];

    const combinedUrls = [...existingUrls];
    const combinedPaths = [...existingPaths];
    const combinedNames = [...existingNames];

    for (let i = 0; i < masterUrls.length; i++) {
      if (!combinedUrls.includes(masterUrls[i])) {
        combinedUrls.push(masterUrls[i]);
        combinedPaths.push(masterPaths[i] ?? masterUrls[i]);
        combinedNames.push(masterNames[i] ?? `Foto Master ${i + 1}`);
      }
    }

    updateDraft({
      photo_urls: combinedUrls,
      photo_paths: combinedPaths,
      photo_names: combinedNames,
    });
    setMessage(`${masterUrls.length} foto dari Master Aset Bangunan/Tanah berhasil ditarik ke Pemanfaatan.`);
  }

  function handlePksChange(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPksFile(null);
      setPksPreviewUrl(null);
      setMessage('Dokumen PKS wajib berformat PDF.');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setPksFile(null);
      setPksPreviewUrl(null);
      setMessage('Dokumen PKS melebihi batas 10MB.');
      return;
    }

    setPksFile(file);
    setPksPreviewUrl(URL.createObjectURL(file));
    setMessage(isSupabaseConfigured ? `File ${file.name} dipilih. Dokumen PKS akan diupload saat disimpan.` : `File ${file.name} dipilih (preview lokal).`);
  }

  function handlePhotoChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nextFiles = Array.from(files);

    const invalid = nextFiles.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      setPhotoFiles([]);
      setPhotoPreviewUrls([]);
      setMessage(`${invalid.name} bukan file gambar.`);
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    const oversized = nextFiles.find((file) => file.size > maxSizeBytes);
    if (oversized) {
      setPhotoFiles([]);
      setPhotoPreviewUrls([]);
      setMessage(`${oversized.name} melebihi batas 10MB.`);
      return;
    }

    setPhotoFiles((current) => [...current, ...nextFiles]);
    setPhotoPreviewUrls((current) => [...current, ...nextFiles.map((file) => URL.createObjectURL(file))]);
    setMessage(isSupabaseConfigured ? `${nextFiles.length} foto pemanfaatan siap diupload saat disimpan.` : `${nextFiles.length} foto pemanfaatan tampil sebagai preview lokal.`);
  }

  async function openPksPreview(item: Utilization) {
    try {
      const url = item.pks_document_url || (item.pks_document_path ? await createAssetDocumentPreviewUrl(item.pks_document_path) : null);
      if (!url) {
        setMessage('Dokumen PKS belum tersedia untuk data pemanfaatan ini.');
        return;
      }
      openNewTab(url, 'Dokumen PKS belum tersedia untuk data pemanfaatan ini.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal membuka dokumen PKS.');
    }
  }
  function openNewTab(url: string | null | undefined, fallbackMessage: string) {
    if (!url) {
      setMessage(fallbackMessage);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function deleteSelectedUtilization(item: Utilization) {
    if (!canManage || deletingId !== null) return;
    const confirmed = window.confirm(`Hapus data pemanfaatan ${item.third_party_name}?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage(isSupabaseConfigured ? 'Menghapus pemanfaatan dari PostgreSQL lokal...' : 'Menghapus pemanfaatan dari state lokal demo...');

    try {
      const result = await deleteUtilization(item.id);
      const nextItems = items.filter((current) => current.id !== item.id);
      setItems(nextItems);
      onUtilizationsChange(nextItems);
      if (draft?.id === item.id) closeForm();
      setMessage(result.mode === 'postgres' ? 'Pemanfaatan berhasil dihapus dari PostgreSQL lokal.' : 'Pemanfaatan berhasil dihapus di mode demo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus pemanfaatan.');
    } finally {
      setDeletingId(null);
    }
  }

  async function saveUtilization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    if (!draft.third_party_name.trim()) {
      setMessage('Nama pihak ketiga wajib diisi.');
      return;
    }

    if (draft.end_date < draft.start_date) {
      setMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    if (!draft.use_full_asset_area && !draft.geometry_geojson && !draft.utilized_area_m2) {
      setMessage('Tentukan luas pemanfaatan: centang seluruh area aset, gambar polygon di peta, atau isi luas manual.');
      return;
    }

    setIsSaving(true);
    setMessage(isSupabaseConfigured ? 'Menyimpan pemanfaatan ke PostgreSQL lokal...' : 'Menyimpan pemanfaatan ke state lokal demo...');

    try {
      const isNew = !items.some((item) => item.id === draft.id);
      const autoStatus = calculateAutomaticStatus(draft.start_date, draft.end_date);
      let result = await persistUtilization({ ...draft, status: autoStatus, third_party_name: draft.third_party_name.trim() }, { isNew });
      let saved = result.utilization;

      if (pksFile) {
        setMessage(isSupabaseConfigured ? 'Mengupload dokumen PKS PDF...' : 'Menyimpan preview PKS lokal...');
        if (isSupabaseConfigured) {
          const uploaded = await uploadUtilizationPks({ utilizationId: saved.id, assetId: saved.asset_id, file: pksFile });
          result = await persistUtilization({
            ...saved,
            pks_document_name: pksFile.name,
            pks_document_path: uploaded.path,
            pks_document_url: null,
          });
          saved = result.utilization;
        } else {
          saved = { ...saved, pks_document_name: pksFile.name, pks_document_url: pksPreviewUrl };
        }
      }

      if (photoFiles.length > 0) {
        setMessage(isSupabaseConfigured ? 'Mengupload foto pemanfaatan...' : 'Menyimpan preview foto pemanfaatan lokal...');
        if (isSupabaseConfigured) {
          const uploadedPhotos = await Promise.all(photoFiles.map((file) => uploadUtilizationPhoto({ utilizationId: saved.id, assetId: saved.asset_id, file })));
          result = await persistUtilization({
            ...saved,
            photo_names: [...(saved.photo_names ?? []), ...photoFiles.map((file) => file.name)],
            photo_paths: [...(saved.photo_paths ?? []), ...uploadedPhotos.map((photo) => photo.path)],
            photo_urls: [...(saved.photo_urls ?? []), ...uploadedPhotos.map((photo) => photo.publicUrl)],
          });
          saved = result.utilization;
        } else {
          saved = {
            ...saved,
            photo_names: [...(saved.photo_names ?? []), ...photoFiles.map((file) => file.name)],
            photo_urls: [...(saved.photo_urls ?? []), ...photoPreviewUrls],
          };
        }
      }

      const nextItems = items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items];
      setItems(nextItems);
      onUtilizationsChange(nextItems);
      setMessage(result.mode === 'postgres' ? 'Pemanfaatan, dokumen PKS, dan foto berhasil disimpan ke PostgreSQL lokal.' : 'Pemanfaatan berhasil disimpan di mode demo.');
      closeForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan pemanfaatan.');
      setIsSaving(false);
    }
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const visibleItems = useMemo(
    () => items.slice((effectiveCurrentPage - 1) * itemsPerPage, effectiveCurrentPage * itemsPerPage),
    [effectiveCurrentPage, items, itemsPerPage]
  );

  if (formOpen && draft) {
    const isEditMode = items.some((item) => item.id === draft.id);
    return (
      <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="utilization-form">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <button
              type="button"
              onClick={closeForm}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              ← Kembali ke Daftar Pemanfaatan
            </button>
            <h3 className="text-xl font-bold text-foreground">{isEditMode ? 'Edit Pemanfaatan Aset' : 'Tambah Pemanfaatan Aset Baru'}</h3>
            <p className="mt-0.5 text-xs text-secondary">Isi formulir rincian pihak ketiga, luasan area, dokumen PKS, dan foto dokumentasi.</p>
          </div>
          <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-gray-50 text-secondary hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={saveUtilization} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-1.5 text-xs font-medium text-foreground">
              <span>Pilih Aset (Ketik Kode / Nama untuk mencari)</span>
              <AssetAutocompleteInput
                assets={assets}
                selectedAssetId={draft.asset_id}
                onSelectAsset={(id) => updateDraft({ asset_id: id })}
              />
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Pihak Ketiga
              <input value={draft.third_party_name} onChange={(event) => updateDraft({ third_party_name: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Jenis Pemanfaatan BMN
              <select value={draft.utilization_type} onChange={(event) => updateDraft({ utilization_type: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer">
                {utilizationTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Mulai
              <input type="date" value={formatDateForInput(draft.start_date)} onChange={(event) => updateDraft({ start_date: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Selesai
              <input type="date" value={formatDateForInput(draft.end_date)} onChange={(event) => updateDraft({ end_date: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-foreground text-sm">Luasan Lokasi Pemanfaatan</h5>
                <p className="mt-0.5 text-xs text-secondary">Pilih seluruh area aset atau gambar polygon area yang dimanfaatkan. Nilai luas akan masuk ke field utilized_area_m2.</p>
              </div>
            </div>
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-gray-50 px-4 py-2.5 text-xs font-semibold text-foreground cursor-pointer">
                <input type="checkbox" checked={Boolean(draft.use_full_asset_area)} onChange={(event) => updateDraft({ use_full_asset_area: event.target.checked, geometry_geojson: event.target.checked ? null : draft.geometry_geojson })} className="rounded border-border text-primary focus:ring-primary" />
                Gunakan seluruh area aset
              </label>
              <label className="grid gap-1 text-xs font-medium text-foreground">
                Luas Manual / Hasil Peta (m²)
                <input type="number" min="0" step="0.01" value={draft.utilized_area_m2 ?? ''} onChange={(event) => updateDraft({ utilized_area_m2: event.target.value ? Number(event.target.value) : null, use_full_asset_area: false })} className="rounded-2xl border border-border bg-white px-4 py-2 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
              </label>
            </div>
            {!draft.use_full_asset_area && <UtilizationAreaMap asset={assetById.get(draft.asset_id)} utilization={draft} editable={canManage} onGeometryChange={(geometry, areaM2) => updateDraft({ geometry_geojson: geometry, utilized_area_m2: areaM2, use_full_asset_area: false })} />}
            {draft.use_full_asset_area && <div className="rounded-2xl bg-success-light px-4 py-3 text-xs font-semibold text-success-dark">Pemanfaatan memakai seluruh area aset terpilih. Luas detail mengikuti master data aset.</div>}
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-sm">Dokumen PKS</h5>
                  <p className="mt-0.5 text-xs text-secondary">Upload perjanjian kerja sama / kontrak pemanfaatan. Format wajib PDF, maksimal 10MB.</p>
                  {(pksFile || draft.pks_document_name) && <p className="mt-1 text-xs font-semibold text-primary">{pksFile?.name ?? draft.pks_document_name}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(pksPreviewUrl || draft.pks_document_path || draft.pks_document_url) && (
                  <button type="button" onClick={() => pksPreviewUrl ? openNewTab(pksPreviewUrl, 'Preview PKS belum tersedia.') : openPksPreview(draft)} className="inline-flex items-center gap-2 rounded-button bg-gray-50 border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-muted transition">
                    <Eye className="h-4 w-4" />
                    Lihat PKS
                  </button>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition">
                  <UploadCloud className="h-4 w-4" />
                  Pilih PDF
                  <input type="file" accept="application/pdf,.pdf" onChange={(event) => handlePksChange(event.target.files?.[0])} className="sr-only" />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-sm">Foto Pemanfaatan</h5>
                  <p className="mt-0.5 text-xs text-secondary">Upload banyak gambar dokumentasi pemanfaatan. Setiap gambar maksimal 10MB.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyPhotosFromMasterAsset}
                  title="Ambil foto dari Master Aset Bangunan/Tanah terpilih"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs active:scale-95"
                >
                  <Copy className="h-4 w-4" />
                  <span>Gunakan Foto Dari Master Aset</span>
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition">
                  <UploadCloud className="h-4 w-4" />
                  Pilih Banyak Gambar
                  <input type="file" multiple accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} className="sr-only" />
                </label>
              </div>
            </div>
            {((draft.photo_names?.length ?? 0) > 0 || photoFiles.length > 0) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...(draft.photo_names ?? []), ...photoFiles.map((file) => file.name)].map((name, index) => {
                  const existingCount = draft.photo_names?.length ?? 0;
                  const url = index < existingCount ? draft.photo_urls?.[index] : photoPreviewUrls[index - existingCount];
                  return (
                    <button key={`${name}-${index}`} type="button" onClick={() => openNewTab(url, 'Preview foto pemanfaatan belum tersedia.')} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-gray-50 border border-border px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted transition">
                      <span className="truncate">{name}</span>
                      <span className="inline-flex items-center gap-1 text-primary font-semibold"><Eye className="h-3.5 w-3.5" /> Lihat</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={closeForm} className="rounded-button border border-border bg-white px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-muted transition">
              Batal
            </button>
            <button disabled={isSaving} className="rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-60">
              {isSaving ? 'Menyimpan...' : 'Simpan Pemanfaatan'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="utilization">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Daftar Pemanfaatan Aset</h3>
          <p className={`mt-1 text-xs font-medium ${message.includes('Gagal') || message.includes('wajib') || message.includes('tidak boleh') ? 'text-error' : 'text-secondary'}`}>{message}</p>
        </div>
        <button
          onClick={openCreate}
          disabled={!canManage || assetOptions.length === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#165DFF] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#165DFF]/25 transition-all duration-200 hover:bg-[#0E4BD9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Pemanfaatan
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase font-semibold text-secondary border-b border-border">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Pihak Ketiga</th>
              <th className="px-4 py-3.5 font-semibold">Universitas</th>
              <th className="px-4 py-3.5 font-semibold">Aset</th>
              <th className="px-4 py-3.5 font-semibold">Jenis</th>
              <th className="px-4 py-3.5 font-semibold">Luas</th>
              <th className="px-4 py-3.5 font-semibold">Periode</th>
              <th className="px-4 py-3.5 font-semibold">PKS</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {visibleItems.map((item) => {
              const asset = assetById.get(item.asset_id);
              return (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-foreground">{item.third_party_name}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-secondary">{asset?.campus_name ?? '-'}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-foreground">{asset ? getAssetDisplayName(asset) : `Aset #${item.asset_id}`}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-[#080C1A]">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200/60">
                      {getUtilizationTypeLabel(item.utilization_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-[#165DFF]">{formatArea(item.utilized_area_m2)}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-secondary">{formatDateRangeIndo(item.start_date, item.end_date)}</td>
                  <td className="px-4 py-3.5">
                    {item.pks_document_path || item.pks_document_url ? (
                      <button
                        onClick={() => openPksPreview(item)}
                        title="Lihat Dokumen PKS"
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-secondary">Belum ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDetail(item)}
                        title="Lihat Detail Pemanfaatan & Slideshow Foto"
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openUtilizationMap(item)}
                        title="Lihat Peta Pemanfaatan"
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                      >
                        <MapPinned className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        disabled={!canManage}
                        title="Edit Pemanfaatan"
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteSelectedUtilization(item)}
                        disabled={!canManage || deletingId === item.id}
                        title={deletingId === item.id ? 'Sedang Menghapus...' : 'Hapus Pemanfaatan'}
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-xs font-medium text-secondary">
                  Belum ada data pemanfaatan aset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-secondary">
            Tampilkan
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-button border border-border bg-white px-2 py-1 text-xs font-semibold text-foreground outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            per halaman
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={effectiveCurrentPage === 1}
            className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-primary shadow-sm hover:border-primary disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Sebelumnya
          </button>
          <span className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            Halaman {effectiveCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={effectiveCurrentPage === totalPages}
            className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-primary shadow-sm hover:border-primary disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {selectedDetail && (
        <UtilizationDetailModal
          utilization={selectedDetail}
          asset={assetById.get(selectedDetail.asset_id)}
          onClose={() => setSelectedDetail(null)}
          onOpenPks={() => openPksPreview(selectedDetail)}
          onOpenMap={() => openUtilizationMap(selectedDetail)}
        />
      )}
    </div>
  );
}

function UtilizationDetailModal({
  utilization,
  asset,
  onClose,
  onOpenPks,
  onOpenMap,
}: {
  utilization: Utilization;
  asset: Asset | undefined;
  onClose: () => void;
  onOpenPks: () => void;
  onOpenMap: () => void;
}) {
  const assetName = asset ? getAssetDisplayName(asset) : `Aset #${utilization.asset_id}`;
  const [pksPdfUrl, setPksPdfUrl] = useState<string | null>(
    utilization.pks_document_url ||
      (utilization.pks_document_path ? createAssetDocumentPreviewUrl(utilization.pks_document_path) : null)
  );

  useEffect(() => {
    const docUrl =
      utilization.pks_document_url ||
      (utilization.pks_document_path ? createAssetDocumentPreviewUrl(utilization.pks_document_path) : null);
    setPksPdfUrl(docUrl);
  }, [utilization.pks_document_url, utilization.pks_document_path]);

  const slideshowItems: SlideshowItem[] = useMemo(() => {
    if (utilization.photo_urls && utilization.photo_urls.length > 0) {
      return utilization.photo_urls.map((url, i) => ({
        name: utilization.photo_names?.[i] ?? `Foto Pemanfaatan ${i + 1}`,
        url,
      }));
    }
    return [];
  }, [utilization]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200/80 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] transition cursor-pointer active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Pemanfaatan</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-[#165DFF]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#165DFF]">
                Detail Pemanfaatan Aset BMN
              </span>
              <StatusPill status={utilization.status} />
            </div>
            <h2 className="text-base font-black text-slate-900 truncate max-w-lg mt-0.5">
              {utilization.third_party_name} — <span className="text-[#165DFF]">{assetName}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMap}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
          >
            <MapPinned className="h-4 w-4" />
            <span className="hidden sm:inline">Lihat Peta Pemanfaatan</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            title="Tutup Detail Fullscreen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Fullscreen Body Container */}
      <div className="mx-auto w-full max-w-7xl p-6 sm:p-8 space-y-8 pb-16">
        {/* Information Grid Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Pihak Ketiga Mitra</span>
            <strong className="text-base font-black text-slate-900 mt-1 block">{utilization.third_party_name}</strong>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Jenis Pemanfaatan BMN</span>
            <strong className="text-sm font-bold text-[#165DFF] mt-1 block">{getUtilizationTypeLabel(utilization.utilization_type)}</strong>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Luas Area Dimanfaatkan</span>
            <strong className="text-base font-black text-emerald-600 mt-1 block">{formatArea(utilization.utilized_area_m2)}</strong>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Periode Pelaksanaan PKS</span>
            <strong className="text-xs font-bold text-slate-800 mt-1 block">{formatDateRangeIndo(utilization.start_date, utilization.end_date)}</strong>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Perguruan Tinggi / Universitas</span>
            <strong className="text-xs font-bold text-slate-800 mt-1 block">{asset?.campus_name ?? '-'}</strong>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Master Aset Terkait</span>
            <strong className="text-xs font-bold text-slate-900 mt-1 block">{assetName}</strong>
          </div>
        </div>

        {/* Section PDF PKS Viewer */}
        {pksPdfUrl ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#165DFF]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Dokumen Perjanjian Kerja Sama (PKS)</h3>
                  <p className="text-xs text-slate-500 font-medium">Viewer PDF interaktif dokumen resmi PKS terlampir.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPks}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#165DFF] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#165DFF]/25 hover:bg-[#0E4BD9] transition cursor-pointer active:scale-95"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Buka PDF di Tab Baru</span>
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 h-[680px] shadow-inner">
              <iframe src={pksPdfUrl} title="Dokumen PKS" className="h-full w-full border-none" />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400 shadow-xs">
            📄 Dokumen PDF PKS belum diupload untuk pemanfaatan ini.
          </div>
        )}

        {/* Section Foto Dokumentasi Slideshow */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-1">Foto Dokumentasi Pemanfaatan ({slideshowItems.length})</h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Slideshow foto dokumentasi pemanfaatan aset pihak ketiga.</p>
          {slideshowItems.length > 0 ? (
            <ImageSlideshow items={slideshowItems} onClose={() => {}} />
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-400">
              🖼️ Belum ada foto dokumentasi pemanfaatan yang terlampir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
