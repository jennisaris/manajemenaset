'use client';

import { FormEvent, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, FileText, MapPinned, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { deleteUtilization, persistUtilization } from '@/lib/utilization-crud';
import { createAssetDocumentPreviewUrl, uploadUtilizationPks, uploadUtilizationPhoto } from '@/lib/storage';
import type { Asset, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';

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

const utilizationTypes = ['sewa', 'kerja_sama', 'pinjam_pakai', 'tenant', 'atm', 'lahan_parkir', 'lainnya'];
const statusOptions = ['draft', 'menunggu_verifikasi', 'aktif', 'akan_berakhir', 'berakhir', 'dibatalkan'];

function StatusPill({ status }: { status: string }) {
  const tone = status === 'akan_berakhir' ? 'bg-amber-50 text-amber-700' : status === 'aktif' ? 'bg-sky-50 text-sky-700' : status === 'berakhir' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status.replaceAll('_', ' ')}</span>;
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
    setPksFile(null);
    setPksPreviewUrl(null);
    setPhotoFiles([]);
    setPhotoPreviewUrls([]);
  }

  function openNewTab(url: string | null | undefined, fallbackMessage: string) {
    if (!url) {
      setMessage(fallbackMessage);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handlePksChange(file: File | undefined) {
    if (!file) {
      setPksFile(null);
      setPksPreviewUrl(null);
      return;
    }

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
      setMessage(`${file.name} melebihi batas 10MB.`);
      return;
    }

    setPksFile(file);
    setPksPreviewUrl(URL.createObjectURL(file));
    setMessage(isSupabaseConfigured ? 'File PKS PDF siap diupload saat pemanfaatan disimpan.' : 'Mode demo: file PKS hanya dipreview lokal sampai PostgreSQL lokal aktif.');
  }

  function handlePhotoChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length === 0) {
      setPhotoFiles([]);
      setPhotoPreviewUrls([]);
      setMessage('Belum ada foto pemanfaatan dipilih.');
      return;
    }

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

  return (
    <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="utilization">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Pemanfaatan Aset</h3>
          <p className={`mt-1 text-xs font-black ${message.includes('Gagal') || message.includes('wajib') || message.includes('tidak boleh') ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>
        </div>
        <button onClick={openCreate} disabled={!canManage || assetOptions.length === 0} className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-300 bg-gradient-to-br from-sky-300 to-sky-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500"><Plus className="h-4 w-4" />Tambah Pemanfaatan</button>
      </div>

      {formOpen && draft && (
        <form onSubmit={saveUtilization} className="mb-4 rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h4 className="font-black">{items.some((item) => item.id === draft.id) ? 'Edit Pemanfaatan' : 'Tambah Pemanfaatan'}</h4><p className="mt-1 text-sm text-slate-500">Simpan ke tabel asset_utilizations saat PostgreSQL lokal aktif.</p></div>
            <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Aset<select value={draft.asset_id} onChange={(event) => updateDraft({ asset_id: Number(event.target.value) })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{assetOptions.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Pihak Ketiga<input value={draft.third_party_name} onChange={(event) => updateDraft({ third_party_name: event.target.value })} required className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Jenis<select value={draft.utilization_type} onChange={(event) => updateDraft({ utilization_type: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{utilizationTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Mulai<input type="date" value={draft.start_date} onChange={(event) => updateDraft({ start_date: event.target.value })} required className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Selesai<input type="date" value={draft.end_date} onChange={(event) => updateDraft({ end_date: event.target.value })} required className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Status<select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
          </div>
          <div className="mt-4 rounded-3xl border border-sky-100 bg-white/80 p-4">
            <div className="mb-3 flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><MapPinned className="h-5 w-5" /></div><div><h5 className="font-black text-slate-900">Luasan Lokasi Pemanfaatan</h5><p className="mt-1 text-xs font-semibold text-slate-500">Pilih seluruh area aset atau gambar polygon area yang dimanfaatkan. Nilai luas akan masuk ke field utilized_area_m2.</p></div></div>
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={Boolean(draft.use_full_asset_area)} onChange={(event) => updateDraft({ use_full_asset_area: event.target.checked, geometry_geojson: event.target.checked ? null : draft.geometry_geojson })} /> Gunakan seluruh area aset</label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Luas Manual / Hasil Peta (m²)<input type="number" min="0" step="0.01" value={draft.utilized_area_m2 ?? ''} onChange={(event) => updateDraft({ utilized_area_m2: event.target.value ? Number(event.target.value) : null, use_full_asset_area: false })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            </div>
            {!draft.use_full_asset_area && <UtilizationAreaMap asset={assetById.get(draft.asset_id)} utilization={draft} editable={canManage} onGeometryChange={(geometry, areaM2) => updateDraft({ geometry_geojson: geometry, utilized_area_m2: areaM2, use_full_asset_area: false })} />}
            {draft.use_full_asset_area && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Pemanfaatan memakai seluruh area aset terpilih. Luas detail mengikuti master data aset.</div>}
          </div>
          <div className="mt-4 rounded-3xl border border-sky-100 bg-white/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><FileText className="h-5 w-5" /></div><div><h5 className="font-black text-slate-900">Dokumen PKS</h5><p className="mt-1 text-xs font-semibold text-slate-500">Upload perjanjian kerja sama / kontrak pemanfaatan. Format wajib PDF, maksimal 10MB.</p>{(pksFile || draft.pks_document_name) && <p className="mt-2 text-xs font-black text-sky-700">{pksFile?.name ?? draft.pks_document_name}</p>}</div></div>
              <div className="flex flex-wrap gap-2">
                {(pksPreviewUrl || draft.pks_document_path || draft.pks_document_url) && <button type="button" onClick={() => pksPreviewUrl ? openNewTab(pksPreviewUrl, 'Preview PKS belum tersedia.') : openPksPreview(draft)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-sky-700 shadow-sm"><Eye className="h-4 w-4" />Lihat PKS</button>}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 shadow-sm"><UploadCloud className="h-4 w-4" />Pilih PDF<input type="file" accept="application/pdf,.pdf" onChange={(event) => handlePksChange(event.target.files?.[0])} className="sr-only" /></label>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-3xl border border-sky-100 bg-white/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><UploadCloud className="h-5 w-5" /></div><div><h5 className="font-black text-slate-900">Foto Pemanfaatan</h5><p className="mt-1 text-xs font-semibold text-slate-500">Upload banyak gambar dokumentasi pemanfaatan. Setiap gambar maksimal 10MB.</p></div></div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 shadow-sm"><UploadCloud className="h-4 w-4" />Pilih Banyak Gambar<input type="file" multiple accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} className="sr-only" /></label>
            </div>
            {((draft.photo_names?.length ?? 0) > 0 || photoFiles.length > 0) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...(draft.photo_names ?? []), ...photoFiles.map((file) => file.name)].map((name, index) => {
                  const existingCount = draft.photo_names?.length ?? 0;
                  const url = index < existingCount ? draft.photo_urls?.[index] : photoPreviewUrls[index - existingCount];
                  return <button key={`${name}-${index}`} type="button" onClick={() => openNewTab(url, 'Preview foto pemanfaatan belum tersedia.')} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-3 py-2 text-left text-xs font-black text-slate-600 shadow-sm hover:bg-sky-100"><span className="truncate">{name}</span><span className="inline-flex items-center gap-1 text-sky-700"><Eye className="h-3.5 w-3.5" /> Lihat</span></button>;
                })}
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600">Batal</button><button disabled={isSaving} className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:opacity-60">{isSaving ? 'Menyimpan...' : 'Simpan Pemanfaatan'}</button></div>
        </form>
      )}

      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="border-b border-sky-100 px-3 py-3">Pihak Ketiga</th><th className="border-b border-sky-100 px-3 py-3">Universitas</th><th className="border-b border-sky-100 px-3 py-3">Aset</th><th className="border-b border-sky-100 px-3 py-3">Jenis</th><th className="border-b border-sky-100 px-3 py-3">Luas</th><th className="border-b border-sky-100 px-3 py-3">Periode</th><th className="border-b border-sky-100 px-3 py-3">PKS</th><th className="border-b border-sky-100 px-3 py-3">Foto</th><th className="border-b border-sky-100 px-3 py-3">Status</th><th className="border-b border-sky-100 px-3 py-3">Aksi</th></tr></thead><tbody>{items.map((item) => { const asset = assetById.get(item.asset_id); return <tr key={item.id}><td className="border-b border-sky-100 px-3 py-3 font-bold">{item.third_party_name}</td><td className="border-b border-sky-100 px-3 py-3 text-xs font-black text-slate-500">{asset?.campus_name ?? '-'}</td><td className="border-b border-sky-100 px-3 py-3">{asset?.asset_name ?? `Aset #${item.asset_id}`}</td><td className="border-b border-sky-100 px-3 py-3">{item.utilization_type.replaceAll('_', ' ')}</td><td className="border-b border-sky-100 px-3 py-3 text-xs font-black text-slate-600">{item.use_full_asset_area ? 'Seluruh aset' : formatArea(item.utilized_area_m2)}</td><td className="border-b border-sky-100 px-3 py-3">{item.start_date.slice(0, 4)} - {item.end_date.slice(0, 4)}</td><td className="border-b border-sky-100 px-3 py-3">{item.pks_document_path || item.pks_document_url ? <button onClick={() => openPksPreview(item)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><Eye className="h-3.5 w-3.5" />Lihat PKS</button> : <span className="text-xs font-semibold text-slate-400">Belum ada</span>}</td><td className="border-b border-sky-100 px-3 py-3">{(item.photo_urls?.length ?? 0) > 0 ? <div className="flex flex-wrap gap-1">{item.photo_urls?.map((url, index) => <button key={`${url}-${index}`} onClick={() => openNewTab(url, 'Preview foto belum tersedia.')} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700"><Eye className="h-3 w-3" />Lihat {index + 1}</button>)}</div> : <span className="text-xs font-semibold text-slate-400">Belum ada</span>}</td><td className="border-b border-sky-100 px-3 py-3"><StatusPill status={item.status} /></td><td className="border-b border-sky-100 px-3 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => openEdit(item)} disabled={!canManage} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Pencil className="h-3.5 w-3.5" />Edit</button><button onClick={() => deleteSelectedUtilization(item)} disabled={!canManage || deletingId === item.id} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Trash2 className="h-3.5 w-3.5" />{deletingId === item.id ? 'Hapus...' : 'Hapus'}</button></div></td></tr>; })}</tbody></table></div>
    </div>
  );
}
