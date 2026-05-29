'use client';

import { FormEvent, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { BadgeCheck, Building2, Eye, FileText, ImageIcon, Landmark, Pencil, Plus, RotateCcw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { canApproveAssets, canManageAssets } from '@/lib/auth';
import { deleteAsset, persistAsset } from '@/lib/asset-crud';
import { isSupabaseConfigured } from '@/lib/supabase';
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
  const [photoMessage, setPhotoMessage] = useState('Upload satu atau lebih foto aset ke bucket asset-photos.');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState<(string | null)[]>([]);
  const [previewDocument, setPreviewDocument] = useState<DocumentPreview | null>(null);
  const [documentMessage, setDocumentMessage] = useState('Upload dokumen pendukung ke bucket asset-documents.');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [saveMessage, setSaveMessage] = useState(isSupabaseConfigured ? 'Mode database aktif: simpan aset akan menulis ke PostgreSQL lokal.' : 'Mode demo: simpan aset masih lokal sampai env PostgreSQL lokal diisi.');
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const canManage = canManageAssets(currentRole);
  const canApprove = canApproveAssets(currentRole);
  const isOperator = currentRole === 'Operator Kampus';
  const isScopedRole = ['Operator Kampus', 'Admin Aset'].includes(currentRole);

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
    setPhotoMessage(isSupabaseConfigured ? 'Foto akan diupload ke storage lokal saat aset disimpan.' : 'Mode demo: preview lokal aktif, upload PostgreSQL lokal menunggu env.');
    setDocumentFiles([]);
    setDocumentNames([]);
    setDocumentPreviewUrls([]);
    setPreviewDocument(null);
    setDocumentMessage(isSupabaseConfigured ? 'Dokumen akan diupload ke storage lokal saat aset disimpan.' : 'Mode demo: daftar dokumen lokal aktif, upload PostgreSQL lokal menunggu env.');
    setSaveMessage(isSupabaseConfigured ? 'Aset baru akan disimpan ke tabel assets.' : 'Mode demo: aset baru tersimpan lokal di browser.');
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
    setPhotoMessage(isSupabaseConfigured ? 'Foto baru akan ditambahkan saat aset disimpan.' : 'Mode demo: preview lokal aktif, upload PostgreSQL lokal menunggu env.');
    setDocumentFiles([]);
    setDocumentNames(asset.document_names ?? []);
    setDocumentPreviewUrls(asset.document_urls ?? []);
    setPreviewDocument(null);
    setDocumentMessage(isSupabaseConfigured ? 'Dokumen baru akan ditambahkan saat aset disimpan.' : 'Mode demo: daftar dokumen lokal aktif, upload PostgreSQL lokal menunggu env.');
    setSaveMessage(isSupabaseConfigured ? 'Perubahan aset akan disimpan ke tabel assets.' : 'Mode demo: perubahan tersimpan lokal di browser.');
    setEditingAsset({ ...asset });
    setFormOpen(true);
  }

  function updateDraft(patch: Partial<Asset>) {
    setFormErrors({});
    setEditingAsset((current) => {
      if (!current) return current;
      const nextPatch = { ...patch };
      if (isScopedRole && currentUniversity) nextPatch.campus_name = currentUniversity;
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
    setSaveMessage(isSupabaseConfigured ? 'Mode database aktif: simpan aset akan menulis ke PostgreSQL lokal.' : 'Mode demo: simpan aset masih lokal sampai env PostgreSQL lokal diisi.');
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
    setPhotoMessage(isSupabaseConfigured ? `${nextFiles.length} foto siap diupload saat simpan dan bisa dipreview lokal.` : `${nextFiles.length} foto tampil sebagai preview lokal karena PostgreSQL lokal env belum diisi.`);
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

  async function openView(asset: Asset) {
    const detailRows = [
      ['Kode Aset', asset.asset_code],
      ['Nama Aset', asset.asset_name],
      ['Jenis', asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'],
      ['Kampus', asset.campus_name],
      ['Unit/Fakultas', asset.faculty_or_unit],
      ['Alamat', asset.address],
      ['Kepemilikan', asset.ownership_status],
      ['Kondisi', asset.condition_status],
      ['Status Verifikasi', normalizeStatus(asset.verification_status)],
      ['Latitude', asset.latitude],
      ['Longitude', asset.longitude],
    ];
    const photoUrls = asset.photo_paths?.length
      ? asset.photo_paths.map((path, index) => asset.photo_urls?.[index] || createAssetPhotoPreviewUrl(path) || asset.primary_photo_url || '')
      : asset.photo_urls ?? (asset.primary_photo_url ? [asset.primary_photo_url] : []);
    let documentUrls = asset.document_urls ?? [];
    if (asset.document_paths?.length) {
      try {
        const signedUrls = await createAssetDocumentPreviewUrls(asset.document_paths);
        documentUrls = signedUrls.map((url, index) => url ?? asset.document_urls?.[index] ?? '');
      } catch (error) {
        setDocumentMessage(error instanceof Error ? error.message : 'Gagal membuat link dokumen pendukung.');
        documentUrls = asset.document_urls ?? [];
      }
    }
    const photoNames = asset.photo_names?.length ? asset.photo_names : photoUrls.map((_, index) => `Foto Aset ${index + 1}`);
    const documentNames = asset.document_names ?? [];
    const photoGallery = photoUrls.length > 0
      ? `<div class="slideshow"><a id="mainPhotoLink" href="${escapeHtml(photoUrls[0])}" target="_blank" rel="noopener noreferrer"><img id="mainPhoto" src="${escapeHtml(photoUrls[0])}" alt="${escapeHtml(photoNames[0] ?? 'Foto Aset 1')}"></a><div class="slidebar"><button type="button" onclick="moveSlide(-1)">‹</button><span id="photoCaption">${escapeHtml(photoNames[0] ?? 'Foto Aset 1')}</span><button type="button" onclick="moveSlide(1)">›</button></div><div class="thumbs">${photoUrls.map((url, index) => `<button type="button" class="thumb ${index === 0 ? 'active' : ''}" onclick="showSlide(${index})"><img src="${escapeHtml(url)}" alt="${escapeHtml(photoNames[index] ?? `Foto ${index + 1}`)}"></button>`).join('')}</div></div><script>const photos=${JSON.stringify(photoUrls)};const photoNames=${JSON.stringify(photoNames)};let currentPhoto=0;function showSlide(index){if(!photos.length)return;currentPhoto=(index+photos.length)%photos.length;document.getElementById('mainPhoto').src=photos[currentPhoto];document.getElementById('mainPhoto').alt=photoNames[currentPhoto]||('Foto '+(currentPhoto+1));document.getElementById('mainPhotoLink').href=photos[currentPhoto];document.getElementById('photoCaption').textContent=photoNames[currentPhoto]||('Foto '+(currentPhoto+1));document.querySelectorAll('.thumb').forEach((item,i)=>item.classList.toggle('active',i===currentPhoto));}function moveSlide(step){showSlide(currentPhoto+step);}</script>`
      : '<p class="muted">Belum ada foto.</p>';
    const documentLinks = documentNames.length > 0
      ? documentNames.map((name, index) => documentUrls[index] ? `<a class="doc" href="${escapeHtml(documentUrls[index])}" target="_blank" rel="noopener noreferrer">Lihat ${escapeHtml(name)}</a>` : `<div class="doc disabled">${escapeHtml(name)} — link belum tersedia</div>`).join('')
      : '<p class="muted">Belum ada dokumen.</p>';
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(asset.asset_name)}</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;background:#f0f9ff;color:#0f172a}.wrap{max-width:1080px;margin:32px auto;padding:24px}.card{background:white;border:1px solid #bae6fd;border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(22,118,194,.14)}h1{margin:0 0 4px;font-size:28px}.muted{color:#64748b;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:20px}.item{background:#f0f9ff;border:1px solid #e0f2fe;border-radius:16px;padding:14px}.label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:900}.value{margin-top:6px;font-size:14px;font-weight:800}.gallery{margin-top:12px}.slideshow{overflow:hidden;border:1px solid #bae6fd;border-radius:22px;background:#f8fafc;box-shadow:0 10px 30px rgba(14,165,233,.12)}#mainPhoto{display:block;width:100%;max-height:560px;object-fit:contain;background:#e0f2fe}.slidebar{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e0f2fe;padding:12px 14px}.slidebar button{border:0;border-radius:999px;background:#0284c7;color:white;width:38px;height:38px;font-size:26px;font-weight:900;cursor:pointer}.slidebar span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:900;color:#0369a1}.thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;padding:12px;border-top:1px solid #e0f2fe}.thumb{overflow:hidden;border:3px solid transparent;border-radius:14px;padding:0;background:white;cursor:pointer}.thumb.active{border-color:#0284c7}.thumb img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.docs{display:grid;gap:10px;margin-top:12px}.doc{display:block;background:#f8fafc;border:1px solid #e0f2fe;border-radius:14px;padding:12px;color:#0369a1;font-weight:900;text-decoration:none}.doc.disabled{color:#94a3b8}</style></head><body><main class="wrap"><section class="card"><p class="muted">Detail Aset</p><h1>${escapeHtml(asset.asset_name)}</h1><p class="muted">${escapeHtml(asset.asset_code)} • ${escapeHtml(asset.asset_type === 'land' ? 'Tanah' : 'Bangunan')}</p><div class="grid">${detailRows.map(([label, value]) => `<div class="item"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join('')}</div><h2>Galeri Foto Aset</h2><div class="gallery">${photoGallery}</div><h2>Dokumen Pendukung</h2><div class="docs">${documentLinks}</div></section></main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function openPhotoPreview(name: string, url?: string | null, path?: string | null) {
    void name;
    const nextUrl = url || (path ? createAssetPhotoPreviewUrl(path) : null);
    if (!nextUrl) {
      setPhotoMessage('Preview foto belum tersedia. Pilih ulang foto atau buka ulang data aset.');
      return;
    }
    openNewTab(nextUrl, 'Preview foto belum tersedia. Pilih ulang foto atau buka ulang data aset.');
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
    setDocumentMessage(isSupabaseConfigured ? `${nextFiles.length} dokumen siap diupload saat simpan dan bisa dipreview lokal.` : `${nextFiles.length} dokumen masuk daftar demo lokal dan bisa dipreview.`);
  }

  async function openDocumentPreview(name: string, url?: string | null, path?: string | null) {
    void name;
    try {
      const nextUrl = url || (path ? await createAssetDocumentPreviewUrl(path) : null);
      if (!nextUrl) {
        setDocumentMessage('Preview belum tersedia. Dokumen lama perlu dibaca ulang dari database atau dokumen baru perlu dipilih ulang.');
        return;
      }
      openNewTab(nextUrl, 'Preview belum tersedia. Dokumen lama perlu dibaca ulang dari database atau dokumen baru perlu dipilih ulang.');
    } catch (error) {
      setDocumentMessage(error instanceof Error ? error.message : 'Gagal membuat preview dokumen.');
      return;
    }
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
    setSaveMessage(isSupabaseConfigured ? 'Menghapus aset dari PostgreSQL lokal...' : 'Menghapus aset dari state lokal demo...');

    try {
      const result = await deleteAsset(asset.id);
      setItems((current) => {
        const nextItems = current.filter((item) => item.id !== asset.id);
        onAssetsChange?.(nextItems);
        return nextItems;
      });
      if (editingAsset?.id === asset.id) closeForm();
      setSaveMessage(result.mode === 'postgres' ? 'Aset berhasil dihapus dari PostgreSQL lokal.' : 'Aset berhasil dihapus di mode demo lokal.');
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
      campus_name: isScopedRole && currentUniversity ? currentUniversity : editingAsset.campus_name,
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

    if (photoFiles.length > 0 && isSupabaseConfigured) {
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

    if (documentFiles.length > 0 && isSupabaseConfigured) {
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

    const nextAsset: Asset = {
      ...normalizedDraft,
      geometry_type: normalizedDraft.asset_type === 'land' ? 'polygon' : 'point',
      geometry_geojson: { type: 'Point', coordinates: [lng, lat] },
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
    setSaveMessage(isSupabaseConfigured ? (isOperator ? 'Mengajukan data aset ke Admin untuk approval...' : 'Menyimpan aset ke PostgreSQL lokal...') : 'Menyimpan aset ke state lokal demo...');

    let savedAsset = nextAsset;
    try {
      const result = await persistAsset(nextAsset);
      savedAsset = result.asset;
      setSaveMessage(result.mode === 'postgres' ? (isOperator ? 'Data aset berhasil diajukan dan menunggu approval Admin.' : 'Aset berhasil disimpan ke PostgreSQL lokal.') : 'Aset berhasil disimpan di mode demo lokal.');
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
          <p className="mt-1 text-sm text-slate-500">Operator Kampus mengajukan data, Admin Aset memverifikasi data kampusnya, Superadmin melihat semua data.</p>
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
            <TextField label="Universitas/Kampus" value={editingAsset.campus_name ?? ''} onChange={(value) => updateDraft({ campus_name: value })} disabled={isScopedRole && Boolean(currentUniversity)} />
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
              {previewDocument.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
              ) : (
                <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[520px] w-full rounded-2xl border border-sky-100 bg-slate-50" />
              )}
              <p className="mt-2 text-xs font-semibold text-slate-500">PDF dan gambar tampil langsung di halaman. Jika format Office tidak bisa dirender browser, simpan sebagai PDF agar preview lebih stabil.</p>
            </div>
          )}
          {formErrors.coordinates && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{formErrors.coordinates}</div>}
          <div className="mt-5">
            <LocationPicker
              latitude={editingAsset.latitude}
              longitude={editingAsset.longitude}
              onChange={(lat, lng, label) => updateDraft({ latitude: lat, longitude: lng, campus_name: isScopedRole && currentUniversity ? currentUniversity : label ?? editingAsset.campus_name })}
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
                  {viewingAsset.document_names?.map((name, index) => (
                    <button key={`${name}-${index}`} type="button" onClick={() => openDocumentPreview(name, viewingAsset.document_urls?.[index], viewingAsset.document_paths?.[index])} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-left text-xs font-black text-slate-600 shadow-sm hover:bg-sky-100">
                      <span className="truncate">{name}</span><span className="inline-flex items-center gap-1 text-sky-700"><Eye className="h-3.5 w-3.5" /> Lihat</span>
                    </button>
                  ))}
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
              {previewDocument.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
              ) : (
                <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[520px] w-full rounded-2xl border border-sky-100 bg-slate-50" />
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
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(asset.verification_status)}`}>{normalizeStatus(asset.verification_status)}</span>
                {asset.has_active_issue && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">Bermasalah</span>}
                {asset.has_active_utilization && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Dimanfaatkan</span>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Aset</th><th className="px-5 py-4">Jenis</th><th className="px-5 py-4">Kampus/Unit</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Indikator</th><th className="px-5 py-4">Aksi</th></tr></thead>
          <tbody>
            {filteredItems.map((asset) => (
              <tr key={asset.id} className="border-t border-sky-100">
                <td className="px-5 py-4"><strong className="block text-slate-950">{asset.asset_name}</strong><span className="text-xs font-semibold text-slate-500">{asset.asset_code}</span></td>
                <td className="px-5 py-4">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</td>
                <td className="px-5 py-4"><span className="block">{asset.campus_name}</span><span className="text-xs text-slate-500">{asset.faculty_or_unit}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(asset.verification_status)}`}>{normalizeStatus(asset.verification_status)}</span></td>
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
