'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, FileText, MapPinned, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { deleteUtilization, persistUtilization } from '@/lib/utilization-crud';
import { createAssetDocumentPreviewUrl, uploadUtilizationPks, uploadUtilizationPhoto } from '@/lib/storage';
import type { Asset, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';
import { formatDateRangeIndo } from '@/lib/date-utils';

const UtilizationAreaMap = dynamic(() => import('./utilization-area-map').then((mod) => mod.UtilizationAreaMap), {
  ssr: false,
  loading: () => <div className="grid h-[320px] place-items-center rounded-3xl bg-sky-50 text-sm font-bold text-sky-700">Memuat peta area pemanfaatan...</div>,
});

import { AssetAutocompleteInput } from './asset-autocomplete-input';

type UtilizationManagerProps = {
  assets: Asset[];
  utilizations: Utilization[];
  canManage: boolean;
  onUtilizationsChange: (utilizations: Utilization[]) => void;
};

const utilizationTypes = ['sewa', 'kerja_sama', 'pinjam_pakai', 'tenant', 'atm', 'lahan_parkir', 'lainnya'];
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
  return {
    id: nextId,
    asset_id: assetId,
    third_party_name: '',
    utilization_type: 'sewa',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    status: 'draft',
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

  const assetOptions = useMemo(() => assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} — ${asset.asset_name}` })), [assets]);
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
    setDraft({ ...item });
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
      let result = await persistUtilization({ ...draft, third_party_name: draft.third_party_name.trim() }, { isNew });
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
              Jenis
              <select value={draft.utilization_type} onChange={(event) => updateDraft({ utilization_type: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                {utilizationTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Mulai
              <input type="date" value={draft.start_date} onChange={(event) => updateDraft({ start_date: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Selesai
              <input type="date" value={draft.end_date} onChange={(event) => updateDraft({ end_date: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Status
              <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>
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
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition">
                <UploadCloud className="h-4 w-4" />
                Pilih Banyak Gambar
                <input type="file" multiple accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} className="sr-only" />
              </label>
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
          className="inline-flex w-fit items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
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
              <th className="px-4 py-3.5 font-semibold">Foto</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {visibleItems.map((item) => {
              const asset = assetById.get(item.asset_id);
              return (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-foreground">{item.third_party_name}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-secondary">{asset?.campus_name ?? '-'}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-foreground">{asset?.asset_name ?? `Aset #${item.asset_id}`}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-foreground">{item.utilization_type.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-secondary">
                    {item.use_full_asset_area ? 'Seluruh aset' : formatArea(item.utilized_area_m2)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-secondary">{formatDateRangeIndo(item.start_date, item.end_date)}</td>
                  <td className="px-4 py-3.5">
                    {item.pks_document_path || item.pks_document_url ? (
                      <button
                        onClick={() => openPksPreview(item)}
                        title="Lihat Dokumen PKS"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-info-light text-primary transition hover:bg-info-light/80"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-secondary">Belum ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {(item.photo_urls?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.photo_urls?.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            onClick={() => openNewTab(url, 'Preview foto belum tersedia.')}
                            title={`Lihat Foto Pemanfaatan ${index + 1}`}
                            className="grid h-8 w-8 place-items-center rounded-xl bg-info-light text-primary transition hover:bg-info-light/80"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-secondary">Belum ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openUtilizationMap(item)}
                        title="Lihat Peta Pemanfaatan"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-success-light text-success-dark transition hover:bg-success-light/80"
                      >
                        <MapPinned className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        disabled={!canManage}
                        title="Edit Pemanfaatan"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-info-light text-primary transition hover:bg-info-light/80 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteSelectedUtilization(item)}
                        disabled={!canManage || deletingId === item.id}
                        title={deletingId === item.id ? 'Sedang Menghapus...' : 'Hapus Pemanfaatan'}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-error-light text-error-dark transition hover:bg-error-light/80 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
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
                <td colSpan={10} className="px-4 py-8 text-center text-xs font-medium text-secondary">
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
              className="rounded-2xl border border-border bg-gray-50 px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            data / hal
          </label>
          <span className="text-xs text-secondary font-medium">
            (Menampilkan {items.length > 0 ? ((effectiveCurrentPage - 1) * itemsPerPage) + 1 : 0}-
            {Math.min(effectiveCurrentPage * itemsPerPage, items.length)} dari {items.length} data)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
