'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Grid,
  Image as ImageIcon,
  Landmark,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { canApproveAssets, canManageAssets } from '@/lib/auth';
import { deleteAsset, persistAsset } from '@/lib/asset-crud';
import { createAssetDocumentPreviewUrl, createAssetPhotoPreviewUrl, uploadAssetDocument, uploadAssetPhoto } from '@/lib/storage';
import type { Asset, UserRole, VerificationStatus } from '@/lib/types';
import { AssetDetailModal, type DocumentPreview } from './assets/asset-detail-modal';
import { AssetFormDrawer, type AssetFormErrors } from './assets/asset-form-drawer';
import { AssetTable } from './assets/asset-table';
import { StatusBadge } from './assets/asset-status-badge';
import { AssetLocationModal } from './assets/asset-location-modal';

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

export function AssetList({
  assets,
  currentRole,
  currentUniversity,
  onAssetsChange,
}: {
  assets: Asset[];
  currentRole: UserRole;
  currentUniversity: string | null;
  onAssetsChange?: (assets: Asset[]) => void;
}) {
  const [items, setItems] = useState(assets);

  useEffect(() => {
    setItems(assets);
  }, [assets]);

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filterType, setFilterType] = useState<'all' | 'land' | 'building'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');

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
  const [mapModalAsset, setMapModalAsset] = useState<Asset | null>(null);

  const canManage = canManageAssets(currentRole);
  const canApprove = canApproveAssets(currentRole);
  const isOperator = currentRole === 'Operator Kampus';
  const isScopedRole = currentRole === 'Operator Kampus';

  const summary = useMemo(() => {
    return {
      total: items.length,
      land: items.filter((a) => a.asset_type === 'land').length,
      building: items.filter((a) => a.asset_type === 'building').length,
      verified: items.filter((a) => a.verification_status === 'terverifikasi').length,
      pending: items.filter((a) => a.verification_status === 'menunggu_verifikasi').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((asset) => {
      const keyword = query.toLowerCase().trim();
      if (
        keyword &&
        ![asset.asset_name, asset.asset_code, asset.campus_name, asset.faculty_or_unit]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      ) {
        return false;
      }
      if (filterType !== 'all' && asset.asset_type !== filterType) return false;
      if (filterStatus !== 'all' && asset.verification_status !== filterStatus) return false;
      if (filterCondition !== 'all') {
        if (filterCondition === 'Baik' && asset.condition_status !== 'Baik') return false;
        if (filterCondition === 'Rusak' && asset.condition_status === 'Baik') return false;
      }
      return true;
    });
  }, [items, query, filterType, filterStatus, filterCondition]);

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
    setEditingAsset({
      ...emptyAsset(Math.max(0, ...items.map((asset) => asset.id)) + 1),
      campus_name: currentUniversity ?? '',
      verification_status: isOperator ? 'menunggu_verifikasi' : 'draft',
    });
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
      setPhotoMessage('Error: Hanya file gambar (JPG/PNG/WebP) yang diperbolehkan.');
      return;
    }

    setPhotoFiles(nextFiles);
    setPhotoNames(nextFiles.map((file) => file.name));
    setPhotoPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
    setPhotoMessage(`${nextFiles.length} foto baru siap diupload saat aset disimpan.`);
  }

  function handleDocumentChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length === 0) {
      setDocumentFiles([]);
      setDocumentMessage('Belum ada dokumen baru dipilih.');
      return;
    }

    setDocumentFiles(nextFiles);
    setDocumentNames(nextFiles.map((file) => file.name));
    setDocumentPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
    setDocumentMessage(`${nextFiles.length} dokumen baru siap diupload saat aset disimpan.`);
  }

  async function openPhotoPreview(name: string, url?: string | null, path?: string | null) {
    let finalUrl = url ?? null;
    if (!finalUrl && path) {
      finalUrl = await createAssetPhotoPreviewUrl(path);
    }
    setPreviewPhoto({ name, url: finalUrl });
  }

  async function openDocumentPreview(name: string, url?: string | null, path?: string | null) {
    let finalUrl = url ?? null;
    if (!finalUrl && path) {
      finalUrl = await createAssetDocumentPreviewUrl(path);
    }
    setPreviewDocument({ name, url: finalUrl });
  }

  function openView(asset: Asset) {
    setViewingAsset(asset);
  }

  async function updateVerificationStatus(asset: Asset, status: VerificationStatus) {
    const updated: Asset = { ...asset, verification_status: status };
    try {
      const result = await persistAsset(updated);
      const nextAsset = result.asset;
      setItems((current) => {
        const nextItems = current.map((item) => (item.id === nextAsset.id ? nextAsset : item));
        setTimeout(() => onAssetsChange?.(nextItems), 0);
        return nextItems;
      });
      if (viewingAsset?.id === asset.id) {
        setViewingAsset(nextAsset);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal memperbarui status verifikasi.');
    }
  }

  async function deleteSelectedAsset(asset: Asset) {
    const ok = confirm(`Hapus aset "${asset.asset_name}" (${asset.asset_code}) dari database?`);
    if (!ok) return;

    setDeletingAssetId(asset.id);
    try {
      await deleteAsset(asset.id);
      setItems((current) => {
        const nextItems = current.filter((item) => item.id !== asset.id);
        setTimeout(() => onAssetsChange?.(nextItems), 0);
        return nextItems;
      });
      if (viewingAsset?.id === asset.id) setViewingAsset(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menghapus aset dari database.');
    } finally {
      setDeletingAssetId(null);
    }
  }

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAsset) return;

    const errors: AssetFormErrors = {};
    if (!editingAsset.asset_code.trim() || !editingAsset.asset_name.trim()) {
      errors.asset_code = 'Kode dan nama aset wajib diisi.';
    }

    const lat = editingAsset.latitude ?? undefined;
    const lng = editingAsset.longitude ?? undefined;
    if ((lat !== undefined && lng === undefined) || (lat === undefined && lng !== undefined)) {
      errors.latitude = 'Latitude dan longitude harus diisi berpasangan.';
      errors.longitude = 'Latitude dan longitude harus diisi berpasangan.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const normalizedDraft: Asset = {
      ...editingAsset,
      campus_name: isOperator && currentUniversity ? currentUniversity : editingAsset.campus_name,
      verification_status: isOperator ? 'menunggu_verifikasi' : editingAsset.verification_status,
    };

    let nextPhotoPaths = normalizedDraft.photo_paths ?? [];
    let nextPhotoNames = normalizedDraft.photo_names ?? [];
    let nextPhotoUrls = normalizedDraft.photo_urls ?? [];
    let primaryPhotoPath = normalizedDraft.primary_photo_path ?? null;
    let primaryPhotoUrl = normalizedDraft.primary_photo_url ?? null;

    if (photoFiles.length > 0) {
      setIsUploadingPhoto(true);
      setPhotoMessage('Mengupload foto ke storage lokal...');
      try {
        const uploadedPhotos = await Promise.all(
          photoFiles.map((file) => uploadAssetPhoto({ assetId: normalizedDraft.id, assetCode: normalizedDraft.asset_code, file }))
        );
        const uploadedPaths = uploadedPhotos.map((photo) => photo.path);
        const uploadedUrls = await Promise.all(uploadedPaths.map((path) => createAssetPhotoPreviewUrl(path)));
        nextPhotoPaths = [...nextPhotoPaths, ...uploadedPaths];
        nextPhotoNames = [...(normalizedDraft.photo_names ?? []), ...photoFiles.map((file) => file.name)];
        nextPhotoUrls = [...nextPhotoUrls, ...uploadedUrls.filter((url): url is string => Boolean(url))];
        primaryPhotoPath = nextPhotoPaths[0] ?? null;
        primaryPhotoUrl = nextPhotoUrls[0] ?? null;
        setPhotoMessage('Foto berhasil diupload ke storage lokal dan bisa dipreview.');
      } catch (error) {
        setPhotoMessage(error instanceof Error ? error.message : 'Upload foto gagal.');
        setIsUploadingPhoto(false);
        return;
      }
      setIsUploadingPhoto(false);
    }

    let nextDocumentPaths = normalizedDraft.document_paths ?? [];
    let nextDocumentNames = normalizedDraft.document_names ?? [];
    let nextDocumentUrls = normalizedDraft.document_urls ?? [];

    if (documentFiles.length > 0) {
      setIsUploadingDocuments(true);
      setDocumentMessage('Mengupload dokumen ke storage lokal...');
      try {
        const uploadedDocuments = await Promise.all(
          documentFiles.map((file) => uploadAssetDocument({ assetId: normalizedDraft.id, assetCode: normalizedDraft.asset_code, file }))
        );
        const uploadedPaths = uploadedDocuments.map((doc) => doc.path);
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
    }

    const selectedGeometry =
      normalizedDraft.geometry_geojson?.type === 'Polygon'
        ? normalizedDraft.geometry_geojson
        : ({ type: 'Point', coordinates: [lng ?? 0, lat ?? 0] } as GeoJSON.Point);

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
      const nextItems = exists ? current.map((asset) => (asset.id === savedAsset.id ? savedAsset : asset)) : [savedAsset, ...current];
      setTimeout(() => onAssetsChange?.(nextItems), 0);
      return nextItems;
    });
    closeForm();
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () => filteredItems.slice((effectiveCurrentPage - 1) * itemsPerPage, effectiveCurrentPage * itemsPerPage),
    [effectiveCurrentPage, filteredItems, itemsPerPage]
  );

  return (
    <div className="space-y-6" id="asset-list">
      {/* Detail Page View (separated from table list) */}
      {viewingAsset && !formOpen ? (
        <AssetDetailModal
          viewingAsset={viewingAsset}
          canApprove={canApprove}
          previewPhoto={previewPhoto}
          previewDocument={previewDocument}
          onClose={() => {
            setViewingAsset(null);
            setPreviewPhoto(null);
            setPreviewDocument(null);
          }}
          onOpenPhotoPreview={openPhotoPreview}
          onOpenDocumentPreview={openDocumentPreview}
          onClosePhotoPreview={() => setPreviewPhoto(null)}
          onCloseDocumentPreview={() => setPreviewDocument(null)}
          onUpdateVerificationStatus={updateVerificationStatus}
          onOpenLargeMap={(asset) => setMapModalAsset(asset)}
        />
      ) : formOpen && editingAsset ? (
        <AssetFormDrawer
          editingAsset={editingAsset}
          isEditMode={items.some((asset) => asset.id === editingAsset.id)}
          isOperator={isOperator}
          currentUniversity={currentUniversity}
          formErrors={formErrors}
          saveMessage={saveMessage}
          photoMessage={photoMessage}
          photoNames={photoNames}
          photoPreviewUrls={photoPreviewUrls}
          previewPhoto={previewPhoto}
          documentMessage={documentMessage}
          documentNames={documentNames}
          documentPreviewUrls={documentPreviewUrls}
          previewDocument={previewDocument}
          isUploadingPhoto={isUploadingPhoto}
          isUploadingDocuments={isUploadingDocuments}
          isSavingAsset={isSavingAsset}
          onClose={closeForm}
          onUpdateDraft={updateDraft}
          onSave={saveAsset}
          onPhotoChange={handlePhotoChange}
          onDocumentChange={handleDocumentChange}
          onOpenPhotoPreview={openPhotoPreview}
          onOpenDocumentPreview={openDocumentPreview}
          onClosePhotoPreview={() => setPreviewPhoto(null)}
          onCloseDocumentPreview={() => setPreviewDocument(null)}
        />
      ) : (
        <>
          {/* KPI Ringkasan Aset Top Bar */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-[#F3F4F3] bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#165DFF]/10 text-[#165DFF]">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6A7686]">Total Aset</p>
                  <h4 className="text-xl font-bold text-[#080C1A]">{summary.total}</h4>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#F3F4F3] bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6A7686]">Bangunan & Tanah</p>
                  <h4 className="text-xl font-bold text-[#080C1A]">
                    {summary.building} Bgn / {summary.land} Tnh
                  </h4>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#F3F4F3] bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6A7686]">Terverifikasi</p>
                  <h4 className="text-xl font-bold text-[#080C1A]">{summary.verified}</h4>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#F3F4F3] bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6A7686]">Menunggu Approval</p>
                  <h4 className="text-xl font-bold text-[#080C1A]">{summary.pending}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Main Card Container */}
          <section className="overflow-hidden rounded-[24px] border border-[#F3F4F3] bg-white shadow-xs">
            {/* Header & Filter Controls Bar */}
            <div className="flex flex-col gap-4 border-b border-[#F3F4F3] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#080C1A]">Data Aset Universitas</h3>
                <p className="text-xs text-[#6A7686]">
                  Kelola inventarisasi tanah dan bangunan serta status verifikasi aset.
                </p>
                {isScopedRole && (
                  <p className="mt-1 text-xs font-semibold text-[#165DFF]">
                    Scope universitas: {currentUniversity ?? 'Belum diset di profil'}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-56 flex-1 sm:flex-none">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7686]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari nama / kode aset..."
                    className="w-full rounded-[50px] border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-2 text-xs font-medium text-[#080C1A] outline-none transition focus:border-[#165DFF] focus:bg-white"
                  />
                </div>

                {/* Filter Tipe */}
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as 'all' | 'land' | 'building');
                    setCurrentPage(1);
                  }}
                  className="rounded-[50px] border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2 text-xs font-semibold text-[#080C1A] outline-none transition focus:border-[#165DFF]"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="building">Bangunan</option>
                  <option value="land">Tanah</option>
                </select>

                {/* Filter Verifikasi */}
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-[50px] border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2 text-xs font-semibold text-[#080C1A] outline-none transition focus:border-[#165DFF]"
                >
                  <option value="all">Semua Status</option>
                  <option value="terverifikasi">Terverifikasi</option>
                  <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
                  <option value="draft">Draft</option>
                  <option value="revisi">Revisi</option>
                </select>

                {/* View Mode Switcher */}
                <div className="flex items-center rounded-[50px] border border-[#E5E7EB] bg-[#F9FAFB] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="Tampilan Tabel"
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition ${viewMode === 'table' ? 'bg-[#165DFF] text-white shadow-xs' : 'text-[#6A7686] hover:text-[#080C1A]'
                      }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Tampilan Grid Kartu"
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition ${viewMode === 'grid' ? 'bg-[#165DFF] text-white shadow-xs' : 'text-[#6A7686] hover:text-[#080C1A]'
                      }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                </div>

                {/* Add Asset Button */}
                <button
                  onClick={openCreate}
                  disabled={!canManage}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[50px] bg-[#165DFF] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#0E4BD9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Aset</span>
                </button>
              </div>
            </div>

            {/* View Mode Content */}
            {viewMode === 'table' ? (
              <AssetTable
                items={paginatedItems}
                canManage={canManage}
                canApprove={canApprove}
                deletingAssetId={deletingAssetId}
                onView={openView}
                onEdit={openEdit}
                onDelete={deleteSelectedAsset}
                onUpdateVerification={updateVerificationStatus}
                onMapClick={(asset) => setMapModalAsset(asset)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedItems.map((asset) => {
                  const Icon = asset.asset_type === 'land' ? Landmark : Building2;
                  const photoCount = asset.photo_urls?.length || (asset.primary_photo_url ? 1 : 0);
                  const docCount = asset.document_urls?.length || asset.document_paths?.length || 0;

                  return (
                    <div
                      key={asset.id}
                      className="flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#F3F4F3] bg-white transition hover:border-[#165DFF]/40 hover:shadow-md"
                    >
                      <div>
                        {/* Photo Header */}
                        <div className="relative h-40 w-full overflow-hidden bg-[#EFF2F7]">
                          {asset.primary_photo_url ? (
                            <img
                              src={asset.primary_photo_url}
                              alt={asset.asset_name}
                              className="h-full w-full object-cover transition duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-[#165DFF]">
                              <Icon className="h-10 w-10 opacity-60" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-[#165DFF] shadow-xs backdrop-blur-xs">
                              {asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <StatusBadge status={asset.verification_status} />
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-4">
                          <h4 className="font-bold text-[#080C1A] text-base leading-snug">{asset.asset_name}</h4>
                          <p className="mt-0.5 text-xs font-semibold text-[#6A7686]">{asset.asset_code}</p>

                          <div className="mt-3 space-y-1.5 text-xs text-[#6A7686]">
                            <p>
                              <strong className="text-[#080C1A]">Kampus:</strong> {asset.campus_name || '-'}
                            </p>
                            <p>
                              <strong className="text-[#080C1A]">Unit:</strong> {asset.faculty_or_unit || '-'}
                            </p>
                            <p>
                              <strong className="text-[#080C1A]">Kondisi & Status:</strong>{' '}
                              <span
                                className={
                                  asset.condition_status === 'Baik' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                                }
                              >
                                {asset.condition_status || 'Baik'}
                              </span>{' '}
                              ({asset.ownership_status || 'Milik Univ'})
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between border-t border-[#F3F4F3] bg-[#F9FAFB] px-4 py-3 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-[#6A7686]">
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5 text-[#165DFF]" /> {photoCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-[#165DFF]" /> {docCount}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openView(asset)}
                            title="Lihat Detail"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#165DFF] hover:border-[#165DFF]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => openEdit(asset)}
                              title="Edit"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#6A7686] hover:border-[#165DFF]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls Bar */}
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-t border-[#F3F4F3] bg-[#F9FAFB]">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-[#6A7686]">
                  Tampilkan
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-[50px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#080C1A] outline-none focus:border-[#165DFF]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  data / hal
                </label>
                <span className="text-xs text-[#6A7686] font-medium">
                  (Menampilkan {filteredItems.length > 0 ? ((effectiveCurrentPage - 1) * itemsPerPage) + 1 : 0}-
                  {Math.min(effectiveCurrentPage * itemsPerPage, filteredItems.length)} dari {filteredItems.length} aset)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={effectiveCurrentPage === 1}
                  className="rounded-[50px] bg-white border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#165DFF] shadow-xs hover:border-[#165DFF] disabled:cursor-not-allowed disabled:text-[#6A7686]/60"
                >
                  Sebelumnya
                </button>
                <span className="rounded-[50px] bg-white border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#080C1A] shadow-xs">
                  Halaman {effectiveCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={effectiveCurrentPage === totalPages}
                  className="rounded-[50px] bg-white border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#165DFF] shadow-xs hover:border-[#165DFF] disabled:cursor-not-allowed disabled:text-[#6A7686]/60"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </section>
        </>
      )}
      {/* Large Map Modal */}
      <AssetLocationModal
        asset={mapModalAsset}
        onClose={() => setMapModalAsset(null)}
        onViewDetail={openView}
      />
    </div>
  );
}
