'use client';

import { FormEvent, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { BadgeCheck, Building2, Eye, FileText, ImageIcon, Landmark, Pencil, Plus, RotateCcw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { canApproveAssets, canManageAssets } from '@/lib/auth';
import { deleteAsset, persistAsset } from '@/lib/asset-crud';

import { createAssetDocumentPreviewUrl, createAssetDocumentPreviewUrls, createAssetPhotoPreviewUrl, uploadAssetDocument, uploadAssetPhoto } from '@/lib/storage';
import type { Asset, AssetType, UserRole, VerificationStatus } from '@/lib/types';

type AssetFormErrors = Partial<Record<'asset_code' | 'latitude' | 'longitude' | 'coordinates', string>>;

type DocumentPreview = {
  name: string;
  url?: string | null;
  mimeType?: string;
};

const LocationPicker = dynamic(() => import('./location-picker').then((mod) => mod.LocationPicker), {
  ssr: false,
  loading: () => <div className="grid h-72 place-items-center rounded-3xl border border-sky-100 bg-sky-50 text-sm font-bold text-sky-700">Memuat peta pemilihan lokasi...</div>,
});

const emptyAsset = (nextId: number): Asset => ({
  id: nextId,
  asset_code: '',
  asset_name: '',
  asset_type: 'building',
  campus_name: '',
  faculty_or_unit: '',
  address: '',
  ownership_status: 'Milik Universitas',
  condition_status: 'Baik',
  verification_status: 'draft',
  latitude: null,
  longitude: null,
  geometry_type: 'point',
  geometry_geojson: null,
  has_active_issue: false,
  has_active_utilization: false,
});

function statusClass(status: Asset['verification_status']) {
  if (status === 'terverifikasi') return 'bg-emerald-50 text-emerald-700';
  if (status === 'menunggu_verifikasi') return 'bg-slate-100 text-slate-600';
  if (status === 'revisi') return 'bg-amber-50 text-amber-700';
  if (status === 'tidak_aktif') return 'bg-rose-50 text-rose-600';
  return 'bg-sky-50 text-sky-700';
}

function normalizeStatus(status: VerificationStatus) {
  return status.replaceAll('_', ' ');
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-flex min-w-36 justify-center rounded-full px-3 py-1 text-center text-xs font-black capitalize ${statusClass(status)}`}>
      {normalizeStatus(status)}
    </span>
  );
}

function TextField({ label, value, onChange, required = false, type = 'text', error, step, min, max, disabled = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; error?: string; step?: string; min?: string; max?: string; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`rounded-2xl border bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-sky-100 focus:border-sky-400 focus:ring-sky-100'}`}
      />
      {error && <span className="text-xs font-black text-rose-600">{error}</span>}
    </label>
  );
}

function SelectField<T extends string>({ label, value, onChange, options, disabled = false }: { label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function AssetList({ assets, currentRole, currentUniversity, onAssetsChange }: { assets: Asset[]; currentRole: UserRole; currentUniversity: string | null; onAssetsChange?: (assets: Asset[]) => void }) {
  const [items, setItems] = useState(assets);
  const [query, setQuery] = useState('');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [formErrors, setFormErrors] = useState<AssetFormErrors>({});
  const [formOpen, setFormOpen] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<(string | null)[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<DocumentPreview | null>(null);
  const [photoMessage, setPhotoMessage] = useState('Upload satu atau lebih foto aset ke storage lokal.');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState<(string | null)[]>([]);
  const [previewDocument, setPreviewDocument] = useState<DocumentPreview | null>(null);
  const [documentMessage, setDocumentMessage] = useState('Upload dokumen pendukung ke storage lokal.');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Mode database aktif: simpan aset akan menulis ke PostgreSQL lokal.');
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const canManage = canManageAssets(currentRole);
  const canApprove = canApproveAssets(currentRole);
  const isOperator = currentRole === 'Operator Kampus';
  const isScopedRole = currentRole === 'Operator Kampus';

  const filteredItems = useMemo(() => {
    const keyword = query.toLowerCase().trim();
    if (!keyword) return items;
    return items.filter((asset) => [asset.asset_name, asset.asset_code, asset.campus_name, asset.faculty_or_unit].filter(Boolean).join(' ').toLowerCase().includes(keyword));
  }, [items, query]);

  function openCreate() {
    if (!canManage) return;
    setFormErrors({});
    setPhotoFiles([]);
    setPhotoNames([]);
    setPhotoPreviewUrls([]);
    setPreviewPhoto(null);
    setPhotoMessage('Foto akan diupload ke storage lokal saat aset disimpan.');
    setDocumentFiles([]);
    setDocumentNames([]);
    setDocumentPreviewUrls([]);
    setPreviewDocument(null);
    setDocumentMessage('Dokumen akan diupload ke storage lokal saat aset disimpan.');
    setSaveMessage('Aset baru akan disimpan ke tabel assets.');
    setEditingAsset({ ...emptyAsset(Math.max(0, ...items.map((asset) => asset.id)) + 1), campus_name: currentUniversity ?? '', verification_status: isOperator ? 'menunggu_verifikasi' : 'draft' });
    setFormOpen(true);
  }

  function openEdit(asset: Asset) {
    if (!canManage) return;
    setFormErrors({});
    setPhotoFiles([]);
    setPhotoNames(asset.photo_names ?? (asset.primary_photo_url ? ['Foto Utama Aset'] : []));
    setPhotoPreviewUrls(asset.photo_urls ?? (asset.primary_photo_url ? [asset.primary_photo_url] : []));
    setPreviewPhoto(null);
    setPhotoMessage('Foto baru akan ditambahkan saat aset disimpan.');
    setDocumentFiles([]);
    setDocumentNames(asset.document_names ?? []);
    setDocumentPreviewUrls(asset.document_urls ?? []);
    setPreviewDocument(null);
    setDocumentMessage('Dokumen baru akan ditambahkan saat aset disimpan.');
    setSaveMessage('Perubahan aset akan disimpan ke tabel assets.');
    setEditingAsset({ ...asset });
    setFormOpen(true);
  }

  function updateDraft(patch: Partial<Asset>) {
    setFormErrors({});
    setEditingAsset((current) => {
      if (!current) return current;
      const nextPatch = { ...patch };
      if (isOperator && currentUniversity) nextPatch.campus_name = currentUniversity;
      if (isOperator && 'verification_status' in nextPatch) delete nextPatch.verification_status;
      return { ...current, ...nextPatch };
    });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingAsset(null);
    setFormErrors({});
    setPhotoFiles([]);
    setPhotoNames([]);
    setPhotoPreviewUrls([]);
    setPreviewPhoto(null);
    setPhotoMessage('Upload satu atau lebih foto aset ke bucket asset-photos.');
    setDocumentFiles([]);
    setDocumentNames([]);
    setDocumentPreviewUrls([]);
    setPreviewDocument(null);
    setDocumentMessage('Upload dokumen pendukung ke bucket asset-documents.');
    setSaveMessage('Mode database aktif: simpan aset akan menulis ke PostgreSQL lokal.');
  }

  function handlePhotoChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length === 0) {
      setPhotoFiles([]);
      setPhotoMessage('Belum ada foto baru dipilih.');
      return;
    }

    const invalid = nextFiles.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      setPhotoFiles([]);
      setPhotoMessage(`${invalid.name} bukan file gambar.`);
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    const oversized = nextFiles.find((file) => file.size > maxSizeBytes);
    if (oversized) {
      setPhotoFiles([]);
      setPhotoMessage(`${oversized.name} melebihi batas 10MB.`);
      return;
    }

    setPhotoFiles(nextFiles);
    setPhotoNames((current) => [...current, ...nextFiles.map((file) => file.name)]);
    setPhotoPreviewUrls((current) => [...current, ...nextFiles.map((file) => URL.createObjectURL(file))]);
    setPhotoMessage(`${nextFiles.length} foto siap diupload saat simpan dan bisa dipreview lokal.`);
  }

  function escapeHtml(value: unknown) {
    return String(value ?? '-')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function openNewTab(url: string | null | undefined, fallbackMessage: string) {
    if (!url) {
      setSaveMessage(fallbackMessage);
      setPhotoMessage(fallbackMessage);
      setDocumentMessage(fallbackMessage);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openView(asset: Asset) {
    setPreviewPhoto(null);
    setPreviewDocument(null);
    setViewingAsset(asset);
    setSaveMessage('Detail aset dibuka. Klik item foto/dokumen untuk melihat preview.');
  }

  function inferMimeType(name: string, url?: string | null) {
    const value = `${name} ${url ?? ''}`.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|svg)(\?|#|$)/.test(value)) return 'image/*';
    if (/\.pdf(\?|#|$)/.test(value)) return 'application/pdf';
    return 'application/octet-stream';
  }

  function openPhotoPreview(name: string, url?: string | null, path?: string | null) {
    const nextUrl = url || (path ? createAssetPhotoPreviewUrl(path) : null);
    if (!nextUrl) {
      setPhotoMessage('Preview foto belum tersedia. Pilih ulang foto atau buka ulang data aset.');
      return;
    }
    setPreviewDocument(null);
    setPreviewPhoto({ name, url: nextUrl, mimeType: inferMimeType(name, nextUrl) });
    setPhotoMessage('Preview foto aset dibuka di bawah detail aset.');
  }
  function handleDocumentChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length === 0) {
      setDocumentFiles([]);
      setDocumentMessage('Belum ada dokumen baru dipilih.');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    const oversized = nextFiles.find((file) => file.size > maxSizeBytes);
    if (oversized) {
      setDocumentFiles([]);
      setDocumentMessage(`${oversized.name} melebihi batas 10MB.`);
      return;
    }

    setDocumentFiles(nextFiles);
    setDocumentNames((current) => [...current, ...nextFiles.map((file) => file.name)]);
    setDocumentPreviewUrls((current) => [...current, ...nextFiles.map((file) => URL.createObjectURL(file))]);
    setDocumentMessage(`${nextFiles.length} dokumen siap diupload saat simpan dan bisa dipreview lokal.`);
  }

  function openDocumentPreview(name: string, url?: string | null, path?: string | null) {
    const nextUrl = url || (path ? createAssetDocumentPreviewUrl(path) : null);
    if (!nextUrl) {
      setDocumentMessage('Preview belum tersedia. Dokumen lama perlu dibaca ulang dari database atau dokumen baru perlu dipilih ulang.');
      return;
    }
    setPreviewPhoto(null);
    setPreviewDocument({ name, url: nextUrl, mimeType: inferMimeType(name, nextUrl) });
    setDocumentMessage('Preview dokumen dibuka di bawah detail aset. Jika browser tidak bisa menampilkan formatnya, klik tombol Buka/Unduh dokumen.');
  }
  function validateAssetDraft(asset: Asset): AssetFormErrors {
    const errors: AssetFormErrors = {};
    const assetCode = asset.asset_code.trim().toUpperCase();
    const isDuplicateCode = items.some((item) => item.id !== asset.id && item.asset_code.trim().toUpperCase() === assetCode);

    if (!assetCode) errors.asset_code = 'Kode aset wajib diisi.';
    else if (isDuplicateCode) errors.asset_code = 'Kode aset sudah digunakan aset lain.';

    if (asset.latitude === null) errors.latitude = 'Latitude wajib diisi lewat peta atau input manual.';
    else if (!Number.isFinite(asset.latitude) || asset.latitude < -90 || asset.latitude > 90) errors.latitude = 'Latitude harus berada di rentang -90 sampai 90.';

    if (asset.longitude === null) errors.longitude = 'Longitude wajib diisi lewat peta atau input manual.';
    else if (!Number.isFinite(asset.longitude) || asset.longitude < -180 || asset.longitude > 180) errors.longitude = 'Longitude harus berada di rentang -180 sampai 180.';

    if ((asset.latitude === null) !== (asset.longitude === null)) errors.coordinates = 'Latitude dan longitude harus terisi lengkap sebagai satu pasangan koordinat.';

    return errors;
  }

  async function deleteSelectedAsset(asset: Asset) {
    if (!canManage || deletingAssetId !== null) return;
    const confirmed = window.confirm(`Hapus aset ${asset.asset_code} — ${asset.asset_name}? Data foto, dokumen, pemanfaatan, dan masalah terkait ikut terhapus oleh relasi database.`);
    if (!confirmed) return;

    setDeletingAssetId(asset.id);
    setSaveMessage('Menghapus aset dari PostgreSQL lokal...');

    try {
      const result = await deleteAsset(asset.id);
      setItems((current) => {
        const nextItems = current.filter((item) => item.id !== asset.id);
        onAssetsChange?.(nextItems);
        return nextItems;
      });
      if (editingAsset?.id === asset.id) closeForm();
      setSaveMessage('Aset berhasil dihapus dari PostgreSQL lokal.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Gagal menghapus aset.');
    } finally {
      setDeletingAssetId(null);
    }
  }

  async function updateVerificationStatus(asset: Asset, verification_status: VerificationStatus) {
    if (!canApprove) return;
    setSaveMessage(verification_status === 'terverifikasi' ? 'Mengapprove data aset...' : 'Mengirim data aset untuk revisi...');
    const nextAsset = { ...asset, verification_status };
    try {
      const result = await persistAsset(nextAsset);
      setItems((current) => {
        const nextItems = current.map((item) => item.id === asset.id ? result.asset : item);
        onAssetsChange?.(nextItems);
        return nextItems;
      });
      setViewingAsset((current) => current?.id === asset.id ? result.asset : current);
      setSaveMessage(verification_status === 'terverifikasi' ? 'Data aset berhasil diapprove.' : 'Data aset dikembalikan untuk revisi.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Gagal memperbarui status verifikasi.');
    }
  }

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAsset) return;

    const normalizedDraft: Asset = {
      ...editingAsset,
      asset_code: editingAsset.asset_code.trim().toUpperCase(),
      campus_name: isOperator && currentUniversity ? currentUniversity : editingAsset.campus_name,
      verification_status: isOperator ? 'menunggu_verifikasi' : editingAsset.verification_status,
    };
    const errors = validateAssetDraft(normalizedDraft);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const lat = normalizedDraft.latitude;
    const lng = normalizedDraft.longitude;
    if (lat === null || lng === null) return;

    let nextPhotoNames = normalizedDraft.photo_names ?? photoNames;
    let nextPhotoPaths = normalizedDraft.photo_paths ?? [];
    let nextPhotoUrls: string[] = normalizedDraft.photo_paths?.length ? (normalizedDraft.photo_urls ?? []).filter((url) => url.startsWith('http')) : [];
    let primaryPhotoUrl = nextPhotoUrls[0] ?? normalizedDraft.primary_photo_url ?? null;
    let primaryPhotoPath = nextPhotoPaths[0] ?? normalizedDraft.primary_photo_path ?? null;

    if (photoFiles.length > 0) {
      setIsUploadingPhoto(true);
      setPhotoMessage('Mengupload foto ke storage lokal...');
      try {
        const uploadedPhotos = await Promise.all(photoFiles.map((file) => uploadAssetPhoto({ assetId: normalizedDraft.id, assetCode: normalizedDraft.asset_code, file })));
        const uploadedPaths = uploadedPhotos.map((photo) => photo.path);
        const uploadedUrls = uploadedPhotos.map((photo) => photo.publicUrl);
        nextPhotoPaths = [...nextPhotoPaths, ...uploadedPaths];
        nextPhotoUrls = [...nextPhotoUrls, ...uploadedUrls];
        nextPhotoNames = [...(normalizedDraft.photo_names ?? []), ...photoFiles.map((file) => file.name)];
        primaryPhotoUrl = nextPhotoUrls[0] ?? null;
        primaryPhotoPath = nextPhotoPaths[0] ?? null;
        setPhotoMessage('Foto berhasil diupload ke storage lokal dan bisa dipreview.');
      } catch (error) {
        setPhotoMessage(error instanceof Error ? error.message : 'Upload foto gagal.');
        setIsUploadingPhoto(false);
        return;
      }
      setIsUploadingPhoto(false);
    } else if (photoFiles.length > 0) {
      nextPhotoNames = photoNames;
    }

    let nextDocumentNames = normalizedDraft.document_names ?? documentNames;
    let nextDocumentPaths = normalizedDraft.document_paths ?? [];
    let nextDocumentUrls: string[] = normalizedDraft.document_paths?.length ? (normalizedDraft.document_urls ?? []).filter((url) => url.startsWith('http')) : [];

    if (documentFiles.length > 0) {
      setIsUploadingDocuments(true);
      setDocumentMessage('Mengupload dokumen ke storage lokal...');
      try {
        const uploadedDocuments = await Promise.all(documentFiles.map((file) => uploadAssetDocument({ assetId: normalizedDraft.id, assetCode: normalizedDraft.asset_code, file })));
        const uploadedPaths = uploadedDocuments.map((document) => document.path);
        const uploadedUrls = await Promise.all(uploadedPaths.map((path) => createAssetDocumentPreviewUrl(path)));
        nextDocumentPaths = [...nextDocumentPaths, ...uploadedPaths];
        nextDocumentNames = [...(normalizedDraft.document_names ?? []), ...documentFiles.map((file) => file.name)];
        nextDocumentUrls = [...nextDocumentUrls, ...uploadedUrls.filter((url): url is string => Boolean(url))];
        setDocumentMessage('Dokumen berhasil diupload ke storage lokal dan bisa dipreview.');
      } catch (error) {
        setDocumentMessage(error instanceof Error ? error.message : 'Upload dokumen gagal.');
        setIsUploadingDocuments(false);
        return;
      }
      setIsUploadingDocuments(false);
    } else if (documentFiles.length > 0) {
      nextDocumentNames = documentNames;
    }

    const selectedGeometry = normalizedDraft.geometry_geojson?.type === 'Polygon'
      ? normalizedDraft.geometry_geojson
      : { type: 'Point', coordinates: [lng, lat] } as GeoJSON.Point;

    const nextAsset: Asset = {
      ...normalizedDraft,
      geometry_type: selectedGeometry.type === 'Polygon' ? 'polygon' : 'point',
      geometry_geojson: selectedGeometry,
      primary_photo_url: primaryPhotoUrl,
      primary_photo_path: primaryPhotoPath,
      photo_paths: nextPhotoPaths,
      photo_urls: nextPhotoUrls,
      photo_names: nextPhotoNames,
      document_paths: nextDocumentPaths,
      document_names: nextDocumentNames,
      document_urls: nextDocumentUrls,
    };

    setIsSavingAsset(true);
    setSaveMessage(isOperator ? 'Mengajukan data aset ke Admin untuk approval...' : 'Menyimpan aset ke PostgreSQL lokal...');

    let savedAsset = nextAsset;
    try {
      const result = await persistAsset(nextAsset);
      savedAsset = result.asset;
      setSaveMessage(isOperator ? 'Data aset berhasil diajukan dan menunggu approval Admin.' : 'Aset berhasil disimpan ke PostgreSQL lokal.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Gagal menyimpan aset ke database.');
      setIsSavingAsset(false);
      return;
    }
    setIsSavingAsset(false);

    setItems((current) => {
      const exists = current.some((asset) => asset.id === savedAsset.id);
      const nextItems = exists ? current.map((asset) => asset.id === savedAsset.id ? savedAsset : asset) : [savedAsset, ...current];
      onAssetsChange?.(nextItems);
      return nextItems;
    });
    closeForm();
  }

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="asset-list">
      <div className="flex flex-col gap-4 border-b border-sky-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-black">Daftar Aset</h3>
          <p className="mt-1 text-sm text-slate-500">Operator Kampus mengajukan data kampusnya, sedangkan Admin Aset dan Superadmin melihat serta memverifikasi data semua kampus.</p>
          {isScopedRole && <p className="mt-2 text-xs font-black text-sky-700">Scope universitas: {currentUniversity ?? 'belum diset di profile'}</p>}
          {!canManage && <p className="mt-2 text-xs font-black text-amber-600">Role {currentRole} hanya boleh melihat data, tombol tambah/edit dikunci.</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex w-full items-center gap-2 rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 text-sm text-slate-500 shadow-sm lg:w-72">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari aset / kode aset" className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
          <button onClick={openCreate} disabled={!canManage} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none">
            <Plus className="h-4 w-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {formOpen && editingAsset && (
        <form onSubmit={saveAsset} className="border-b border-sky-100 bg-sky-50/50 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-black">{items.some((asset) => asset.id === editingAsset.id) ? 'Edit Aset' : 'Tambah Aset'}</h4>
              <p className="mt-1 text-sm text-slate-500">Form aset terhubung ke tabel <strong>assets</strong> saat PostgreSQL lokal aktif.</p>
              <p className={`mt-2 text-xs font-black ${saveMessage.includes('Gagal') || saveMessage.includes('duplicate') ? 'text-rose-600' : 'text-slate-500'}`}>{saveMessage}</p>
            </div>
            <button type="button" onClick={closeForm} className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="Kode Aset" value={editingAsset.asset_code} onChange={(value) => updateDraft({ asset_code: value.toUpperCase() })} required error={formErrors.asset_code} />
            <TextField label="Nama Aset" value={editingAsset.asset_name} onChange={(value) => updateDraft({ asset_name: value })} required />
            <SelectField<AssetType> label="Jenis Aset" value={editingAsset.asset_type} onChange={(value) => updateDraft({ asset_type: value })} options={[{ value: 'building', label: 'Bangunan' }, { value: 'land', label: 'Tanah' }]} />
            <TextField label="Universitas/Kampus" value={editingAsset.campus_name ?? ''} onChange={(value) => updateDraft({ campus_name: value })} disabled={isOperator && Boolean(currentUniversity)} />
            <TextField label="Unit/Fakultas" value={editingAsset.faculty_or_unit ?? ''} onChange={(value) => updateDraft({ faculty_or_unit: value })} />
            <SelectField<VerificationStatus> label="Status Verifikasi" value={isOperator ? 'menunggu_verifikasi' : editingAsset.verification_status} onChange={(value) => updateDraft({ verification_status: value })} disabled={isOperator} options={[{ value: 'draft', label: 'Draft' }, { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' }, { value: 'revisi', label: 'Revisi' }, { value: 'terverifikasi', label: 'Terverifikasi' }, { value: 'tidak_aktif', label: 'Tidak Aktif' }]} />
            <TextField label="Latitude Otomatis" type="number" step="any" min="-90" max="90" value={editingAsset.latitude?.toString() ?? ''} onChange={(value) => updateDraft({ latitude: value ? Number(value) : null })} error={formErrors.latitude} />
            <TextField label="Longitude Otomatis" type="number" step="any" min="-180" max="180" value={editingAsset.longitude?.toString() ?? ''} onChange={(value) => updateDraft({ longitude: value ? Number(value) : null })} error={formErrors.longitude} />
            <TextField label="Alamat" value={editingAsset.address ?? ''} onChange={(value) => updateDraft({ address: value })} />
          </div>
          <div className="mt-5 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><ImageIcon className="h-5 w-5" /></div>
                <div>
                  <h5 className="font-black text-slate-900">Foto Utama Aset</h5>
                  <p className="mt-1 text-sm text-slate-500">Upload satu atau lebih gambar dokumentasi visual aset. Bucket target: <strong>asset-photos</strong>.</p>
                  <p className={`mt-2 text-xs font-black ${photoMessage.includes('gagal') || photoMessage.includes('harus') ? 'text-rose-600' : 'text-slate-500'}`}>{photoMessage}</p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:border-sky-200">
                <UploadCloud className="h-4 w-4" /> Pilih Foto
                <input type="file" multiple accept="image/*" onChange={(event) => handlePhotoChange(event.target.files)} className="sr-only" />
              </label>
            </div>
            {photoNames.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {photoNames.map((name, index) => {
                  const previewUrl = photoPreviewUrls[index];
                  const previewPath = editingAsset.photo_paths?.[index];
                  return (
                    <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs font-black text-slate-600">
                      <ImageIcon className="h-4 w-4 shrink-0 text-sky-700" />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => openPhotoPreview(name, previewUrl, previewPath)}
                        disabled={!previewUrl && !previewPath}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        title={previewUrl ? 'Lihat foto tanpa download' : 'Preview belum tersedia'}
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {previewPhoto?.url && (
            <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-black text-slate-900">Preview Foto Aset</h5>
                  <p className="mt-1 text-xs font-bold text-slate-500">{previewPhoto.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewPhoto(null)} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500"><X className="h-4 w-4" /></button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhoto.url} alt={previewPhoto.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
            </div>
          )}
          <div className="mt-5 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><FileText className="h-5 w-5" /></div>
                <div>
                  <h5 className="font-black text-slate-900">Dokumen Pendukung</h5>
                  <p className="mt-1 text-sm text-slate-500">Unggah sertifikat, IMB, perjanjian, atau dokumen aset lain. Bucket target: <strong>asset-documents</strong>.</p>
                  <p className={`mt-2 text-xs font-black ${documentMessage.includes('gagal') || documentMessage.includes('melebihi') ? 'text-rose-600' : 'text-slate-500'}`}>{documentMessage}</p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:border-sky-200">
                <UploadCloud className="h-4 w-4" /> Pilih Dokumen
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => handleDocumentChange(event.target.files)} className="sr-only" />
              </label>
            </div>
            {documentNames.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {documentNames.map((name, index) => {
                  const previewUrl = documentPreviewUrls[index];
                  const previewPath = editingAsset.document_paths?.[index];
                  return (
                    <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs font-black text-slate-600">
                      <FileText className="h-4 w-4 shrink-0 text-sky-700" />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => openDocumentPreview(name, previewUrl, previewPath)}
                        disabled={!previewUrl && !previewPath}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        title={previewUrl ? 'Lihat dokumen tanpa download' : 'Preview belum tersedia'}
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {previewDocument?.url && (
            <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-black text-slate-900">Preview Dokumen Pendukung</h5>
                  <p className="mt-1 text-xs font-bold text-slate-500">{previewDocument.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewDocument(null)} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500"><X className="h-4 w-4" /></button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2"><a href={previewDocument.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-700"><Eye className="h-4 w-4" /> Buka/Unduh dokumen</a></div>
              {previewDocument.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
              ) : previewDocument.mimeType === 'application/pdf' ? (
                <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[520px] w-full rounded-2xl border border-sky-100 bg-slate-50" />
              ) : (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-slate-600">Format dokumen ini mungkin tidak bisa ditampilkan langsung oleh browser. Klik tombol Buka/Unduh dokumen di atas.</div>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-500">PDF dan gambar tampil langsung di halaman. Jika format Office tidak bisa dirender browser, simpan sebagai PDF agar preview lebih stabil.</p>
            </div>
          )}
          {formErrors.coordinates && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{formErrors.coordinates}</div>}
          <div className="mt-5">
            <LocationPicker
              latitude={editingAsset.latitude}
              longitude={editingAsset.longitude}
              geometry={editingAsset.geometry_geojson}
              onChange={(lat, lng, label) => updateDraft({ latitude: lat, longitude: lng, campus_name: label ?? editingAsset.campus_name })}
              onGeometryChange={(geometry) => updateDraft({ geometry_geojson: geometry, geometry_type: geometry ? 'polygon' : 'point' })}
            />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeForm} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600">Batal</button>
            <button type="submit" disabled={isUploadingPhoto || isUploadingDocuments || isSavingAsset} className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none">{isUploadingPhoto ? 'Upload Foto...' : isUploadingDocuments ? 'Upload Dokumen...' : isSavingAsset ? 'Simpan Database...' : isOperator ? 'Ajukan ke Admin' : 'Simpan Aset'}</button>
          </div>
        </form>
      )}

      {viewingAsset && (
        <div className="border-b border-sky-100 bg-white p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">{viewingAsset.verification_status === 'menunggu_verifikasi' ? 'Detail Usulan Data Aset' : 'Detail Aset'}</p>
              <h4 className="mt-1 text-xl font-black text-slate-950">{viewingAsset.asset_name}</h4>
              <p className="mt-1 text-sm font-semibold text-slate-500">{viewingAsset.asset_code} • {viewingAsset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {canApprove && viewingAsset.verification_status === 'menunggu_verifikasi' && <button type="button" onClick={() => updateVerificationStatus(viewingAsset, 'terverifikasi')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700"><BadgeCheck className="h-4 w-4" />Approve</button>}
              {canApprove && viewingAsset.verification_status === 'menunggu_verifikasi' && <button type="button" onClick={() => updateVerificationStatus(viewingAsset, 'revisi')} className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700"><RotateCcw className="h-4 w-4" />Revisi</button>}
              <button type="button" onClick={() => { setViewingAsset(null); setPreviewPhoto(null); setPreviewDocument(null); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ['Kampus', viewingAsset.campus_name],
              ['Unit/Fakultas', viewingAsset.faculty_or_unit],
              ['Alamat', viewingAsset.address],
              ['Kepemilikan', viewingAsset.ownership_status],
              ['Kondisi', viewingAsset.condition_status],
              ['Status Verifikasi', normalizeStatus(viewingAsset.verification_status)],
              ['Latitude', viewingAsset.latitude?.toString()],
              ['Longitude', viewingAsset.longitude?.toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{value || '-'}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-4">
              <h5 className="flex items-center gap-2 font-black text-slate-900"><ImageIcon className="h-5 w-5 text-sky-700" /> Foto Aset</h5>
              {(viewingAsset.photo_names?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-2">
                  {viewingAsset.photo_names?.map((name, index) => {
                    const url = viewingAsset.photo_urls?.[index] ?? (index === 0 ? viewingAsset.primary_photo_url : null);
                    const path = viewingAsset.photo_paths?.[index] ?? (index === 0 ? viewingAsset.primary_photo_path : null);
                    return (
                      <button key={`${name}-${index}`} type="button" onClick={() => openPhotoPreview(name, url, path)} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-left text-xs font-black text-slate-600 shadow-sm hover:bg-sky-100">
                        <span className="truncate">{name}</span><span className="inline-flex items-center gap-1 text-sky-700"><Eye className="h-3.5 w-3.5" /> Lihat</span>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="mt-2 text-sm font-semibold text-slate-500">Belum ada foto aset.</p>}
            </div>

            <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-4">
              <h5 className="flex items-center gap-2 font-black text-slate-900"><FileText className="h-5 w-5 text-sky-700" /> Dokumen Pendukung</h5>
              {(viewingAsset.document_names?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-2">
                  {viewingAsset.document_names?.map((name, index) => {
                    const url = viewingAsset.document_urls?.[index] || (viewingAsset.document_paths?.[index] ? createAssetDocumentPreviewUrl(viewingAsset.document_paths[index]) : null);
                    return (
                      <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm hover:bg-sky-100">
                        <button type="button" onClick={() => openDocumentPreview(name, url, viewingAsset.document_paths?.[index])} className="min-w-0 flex-1 truncate text-left">{name}</button>
                        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sky-700"><Eye className="h-3.5 w-3.5" /> Buka</a> : <span className="shrink-0 text-slate-400">Link kosong</span>}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="mt-2 text-sm font-semibold text-slate-500">Belum ada dokumen pendukung.</p>}
            </div>
          </div>

          {previewPhoto?.url && (
            <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h5 className="font-black text-slate-900">Preview Foto Aset</h5><p className="mt-1 text-xs font-bold text-slate-500">{previewPhoto.name}</p></div><button type="button" onClick={() => setPreviewPhoto(null)} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500"><X className="h-4 w-4" /></button></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhoto.url} alt={previewPhoto.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
            </div>
          )}

          {previewDocument?.url && (
            <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h5 className="font-black text-slate-900">Preview Dokumen Pendukung</h5><p className="mt-1 text-xs font-bold text-slate-500">{previewDocument.name}</p></div><button type="button" onClick={() => setPreviewDocument(null)} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500"><X className="h-4 w-4" /></button></div>
              <div className="mb-3 flex flex-wrap gap-2"><a href={previewDocument.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-700"><Eye className="h-4 w-4" /> Buka/Unduh dokumen</a></div>
              {previewDocument.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
              ) : previewDocument.mimeType === 'application/pdf' ? (
                <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[520px] w-full rounded-2xl border border-sky-100 bg-slate-50" />
              ) : (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-slate-600">Format dokumen ini mungkin tidak bisa ditampilkan langsung oleh browser. Klik tombol Buka/Unduh dokumen di atas.</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 p-5 lg:hidden">
        {filteredItems.map((asset) => {
          const Icon = asset.asset_type === 'land' ? Landmark : Building2;
          return (
            <article key={asset.id} className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5" /></div>
                  <div><h4 className="font-black leading-tight">{asset.asset_name}</h4><p className="mt-1 text-xs font-semibold text-slate-500">{asset.asset_code} • {asset.campus_name}</p></div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openView(asset)} title={canApprove && asset.verification_status === 'menunggu_verifikasi' ? 'Detail Usulan' : 'Lihat Aset'} className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Eye className="h-4 w-4" /></button>
                  {canApprove && asset.verification_status === 'menunggu_verifikasi' && <button onClick={() => updateVerificationStatus(asset, 'terverifikasi')} className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-4 w-4" /></button>}
                  {canApprove && asset.verification_status === 'menunggu_verifikasi' && <button onClick={() => updateVerificationStatus(asset, 'revisi')} className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><RotateCcw className="h-4 w-4" /></button>}
                  <button onClick={() => openEdit(asset)} disabled={!canManage} className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteSelectedAsset(asset)} disabled={!canManage || deletingAssetId === asset.id} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <span className="inline-flex min-w-24 justify-center rounded-full bg-sky-50 px-3 py-1 text-center text-xs font-black text-sky-700">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</span>
                <StatusBadge status={asset.verification_status} />
                {asset.has_active_issue && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">Bermasalah</span>}
                {asset.has_active_utilization && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Dimanfaatkan</span>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Aset</th><th className="px-5 py-4">Jenis</th><th className="px-5 py-4">Kampus/Unit</th><th className="px-5 py-4 text-center">Status</th><th className="px-5 py-4">Indikator</th><th className="px-5 py-4">Aksi</th></tr></thead>
          <tbody>
            {filteredItems.map((asset) => (
              <tr key={asset.id} className="border-t border-sky-100">
                <td className="px-5 py-4"><strong className="block text-slate-950">{asset.asset_name}</strong><span className="text-xs font-semibold text-slate-500">{asset.asset_code}</span></td>
                <td className="px-5 py-4">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</td>
                <td className="px-5 py-4"><span className="block">{asset.campus_name}</span><span className="text-xs text-slate-500">{asset.faculty_or_unit}</span></td>
                <td className="px-5 py-4 text-center"><StatusBadge status={asset.verification_status} /></td>
                <td className="px-5 py-4"><div className="flex flex-wrap gap-2">{asset.has_active_issue && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">Masalah</span>}{asset.has_active_utilization && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Pemanfaatan</span>}{!asset.has_active_issue && !asset.has_active_utilization && <span className="text-xs font-semibold text-slate-400">Normal</span>}</div></td>
                <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => openView(asset)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><Eye className="h-3.5 w-3.5" />{canApprove && asset.verification_status === 'menunggu_verifikasi' ? 'Detail Usulan' : 'Lihat Aset'}</button>{canApprove && asset.verification_status === 'menunggu_verifikasi' && <button onClick={() => updateVerificationStatus(asset, 'terverifikasi')} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Approve</button>}{canApprove && asset.verification_status === 'menunggu_verifikasi' && <button onClick={() => updateVerificationStatus(asset, 'revisi')} className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"><RotateCcw className="h-3.5 w-3.5" />Revisi</button>}<button onClick={() => openEdit(asset)} disabled={!canManage} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Pencil className="h-3.5 w-3.5" />Edit</button><button onClick={() => deleteSelectedAsset(asset)} disabled={!canManage || deletingAssetId === asset.id} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Trash2 className="h-3.5 w-3.5" />{deletingAssetId === asset.id ? 'Hapus...' : 'Hapus'}</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredItems.length === 0 && <div className="grid place-items-center p-8 text-sm font-bold text-slate-500">Tidak ada aset yang cocok dengan pencarian.</div>}
    </section>
  );
}
