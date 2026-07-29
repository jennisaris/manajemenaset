import { FormEvent, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Eye, FileText, ImageIcon, UploadCloud, X } from 'lucide-react';
import type { Asset, AssetType, VerificationStatus } from '@/lib/types';
import { ImageSlideshow, SlideshowItem } from './image-slideshow';

export type AssetFormErrors = Partial<Record<'asset_code' | 'latitude' | 'longitude' | 'coordinates', string>>;

export type DocumentPreview = {
  name: string;
  url?: string | null;
  mimeType?: string;
};

const LocationPicker = dynamic(() => import('../location-picker').then((mod) => mod.LocationPicker), {
  ssr: false,
  loading: () => <div className="grid h-72 place-items-center rounded-3xl border border-sky-100 bg-sky-50 text-sm font-bold text-sky-700">Memuat peta pemilihan lokasi...</div>,
});

export function TextField({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  error,
  step,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  error?: string;
  step?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
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
        className={`rounded-2xl border bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-sky-100 focus:border-sky-400 focus:ring-sky-100'
        }`}
      />
      {error && <span className="text-xs font-black text-rose-600">{error}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type AssetFormDrawerProps = {
  editingAsset: Asset;
  isEditMode: boolean;
  isOperator: boolean;
  currentUniversity: string | null;
  formErrors: AssetFormErrors;
  saveMessage: string;
  photoMessage: string;
  photoNames: string[];
  photoPreviewUrls: (string | null)[];
  previewPhoto: DocumentPreview | null;
  documentMessage: string;
  documentNames: string[];
  documentPreviewUrls: (string | null)[];
  previewDocument: DocumentPreview | null;
  isUploadingPhoto: boolean;
  isUploadingDocuments: boolean;
  isSavingAsset: boolean;
  onClose: () => void;
  onUpdateDraft: (patch: Partial<Asset>) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onPhotoChange: (files: FileList | null) => void;
  onDocumentChange: (files: FileList | null) => void;
  onOpenPhotoPreview: (name: string, url?: string | null, path?: string | null) => void;
  onOpenDocumentPreview: (name: string, url?: string | null, path?: string | null) => void;
  onClosePhotoPreview: () => void;
  onCloseDocumentPreview: () => void;
};

export function AssetFormDrawer({
  editingAsset,
  isEditMode,
  isOperator,
  currentUniversity,
  formErrors,
  saveMessage,
  photoMessage,
  photoNames,
  photoPreviewUrls,
  previewPhoto,
  documentMessage,
  documentNames,
  documentPreviewUrls,
  previewDocument,
  isUploadingPhoto,
  isUploadingDocuments,
  isSavingAsset,
  onClose,
  onUpdateDraft,
  onSave,
  onPhotoChange,
  onDocumentChange,
  onOpenPhotoPreview,
  onOpenDocumentPreview,
  onClosePhotoPreview,
  onCloseDocumentPreview,
}: AssetFormDrawerProps) {
  const slideshowItems: SlideshowItem[] = useMemo(() => {
    return photoNames
      .map((name, index) => ({
        name,
        url: photoPreviewUrls[index] ?? '',
      }))
      .filter((item) => Boolean(item.url));
  }, [photoNames, photoPreviewUrls]);

  const activePhotoIndex = useMemo(() => {
    if (!previewPhoto) return 0;
    const index = slideshowItems.findIndex((item) => item.name === previewPhoto.name);
    return index >= 0 ? index : 0;
  }, [previewPhoto, slideshowItems]);

  return (
    <form onSubmit={onSave} className="border-b border-sky-100 bg-sky-50/50 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-black">{isEditMode ? 'Edit Aset' : 'Tambah Aset'}</h4>
          <p className="mt-1 text-sm text-slate-500">
            Form aset terhubung ke tabel <strong>assets</strong> saat PostgreSQL lokal aktif.
          </p>
          <p className={`mt-2 text-xs font-black ${saveMessage.includes('Gagal') || saveMessage.includes('duplicate') ? 'text-rose-600' : 'text-slate-500'}`}>
            {saveMessage}
          </p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500 hover:bg-sky-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField
          label="Kode Aset"
          value={editingAsset.asset_code}
          onChange={(value) => onUpdateDraft({ asset_code: value.toUpperCase() })}
          required
          error={formErrors.asset_code}
        />
        <TextField
          label="Nama Aset"
          value={editingAsset.asset_name}
          onChange={(value) => onUpdateDraft({ asset_name: value })}
          required
        />
        <SelectField<AssetType>
          label="Jenis Aset"
          value={editingAsset.asset_type}
          onChange={(value) => onUpdateDraft({ asset_type: value })}
          options={[
            { value: 'building', label: 'Bangunan' },
            { value: 'land', label: 'Tanah' },
          ]}
        />
        <TextField
          label="Universitas/Kampus"
          value={editingAsset.campus_name ?? ''}
          onChange={(value) => onUpdateDraft({ campus_name: value })}
          disabled={isOperator && Boolean(currentUniversity)}
        />
        <TextField
          label="Unit/Fakultas"
          value={editingAsset.faculty_or_unit ?? ''}
          onChange={(value) => onUpdateDraft({ faculty_or_unit: value })}
        />
        <SelectField<VerificationStatus>
          label="Status Verifikasi"
          value={isOperator ? 'menunggu_verifikasi' : editingAsset.verification_status}
          onChange={(value) => onUpdateDraft({ verification_status: value })}
          disabled={isOperator}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
            { value: 'revisi', label: 'Revisi' },
            { value: 'terverifikasi', label: 'Terverifikasi' },
            { value: 'tidak_aktif', label: 'Tidak Aktif' },
          ]}
        />
        <TextField
          label="Latitude Otomatis"
          type="number"
          step="any"
          min="-90"
          max="90"
          value={editingAsset.latitude?.toString() ?? ''}
          onChange={(value) => onUpdateDraft({ latitude: value ? Number(value) : null })}
          error={formErrors.latitude}
        />
        <TextField
          label="Longitude Otomatis"
          type="number"
          step="any"
          min="-180"
          max="180"
          value={editingAsset.longitude?.toString() ?? ''}
          onChange={(value) => onUpdateDraft({ longitude: value ? Number(value) : null })}
          error={formErrors.longitude}
        />
        <TextField
          label="Alamat"
          value={editingAsset.address ?? ''}
          onChange={(value) => onUpdateDraft({ address: value })}
        />
      </div>

      {/* Foto Upload Section */}
      <div className="mt-5 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-black text-slate-900">Foto Utama Aset</h5>
              <p className="mt-1 text-sm text-slate-500">
                Upload satu atau lebih gambar dokumentasi visual aset. Bucket target: <strong>asset-photos</strong>.
              </p>
              <p className={`mt-2 text-xs font-black ${photoMessage.includes('gagal') || photoMessage.includes('harus') ? 'text-rose-600' : 'text-slate-500'}`}>
                {photoMessage}
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:border-sky-200">
            <UploadCloud className="h-4 w-4" /> Pilih Foto
            <input type="file" multiple accept="image/*" onChange={(event) => onPhotoChange(event.target.files)} className="sr-only" />
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
                    onClick={() => onOpenPhotoPreview(name, previewUrl, previewPath)}
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

      {previewPhoto?.url && slideshowItems.length > 0 && (
        <ImageSlideshow
          items={slideshowItems}
          initialIndex={activePhotoIndex}
          onClose={onClosePhotoPreview}
        />
      )}

      {/* Dokumen Upload Section */}
      <div className="mt-5 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-black text-slate-900">Dokumen Pendukung</h5>
              <p className="mt-1 text-sm text-slate-500">
                Unggah sertifikat, IMB, perjanjian, atau dokumen aset lain. Bucket target: <strong>asset-documents</strong>.
              </p>
              <p className={`mt-2 text-xs font-black ${documentMessage.includes('gagal') || documentMessage.includes('melebihi') ? 'text-rose-600' : 'text-slate-500'}`}>
                {documentMessage}
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:border-sky-200">
            <UploadCloud className="h-4 w-4" /> Pilih Dokumen
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => onDocumentChange(event.target.files)} className="sr-only" />
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
                    onClick={() => onOpenDocumentPreview(name, previewUrl, previewPath)}
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
            <button type="button" onClick={onCloseDocumentPreview} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <a href={previewDocument.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
              <Eye className="h-4 w-4" /> Buka/Unduh dokumen
            </a>
          </div>
          {previewDocument.mimeType?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[520px] w-full rounded-2xl border border-sky-100 object-contain" />
          ) : previewDocument.mimeType === 'application/pdf' ? (
            <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[520px] w-full rounded-2xl border border-sky-100 bg-slate-50" />
          ) : (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-slate-600">
              Format dokumen ini mungkin tidak bisa ditampilkan langsung oleh browser. Klik tombol Buka/Unduh dokumen di atas.
            </div>
          )}
          <p className="mt-2 text-xs font-semibold text-slate-500">
            PDF dan gambar tampil langsung di halaman. Jika format Office tidak bisa dirender browser, simpan sebagai PDF agar preview lebih stabil.
          </p>
        </div>
      )}

      {formErrors.coordinates && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {formErrors.coordinates}
        </div>
      )}

      <div className="mt-5">
        <LocationPicker
          latitude={editingAsset.latitude}
          longitude={editingAsset.longitude}
          geometry={editingAsset.geometry_geojson}
          onChange={(lat, lng, label) => onUpdateDraft({ latitude: lat, longitude: lng, campus_name: label ?? editingAsset.campus_name })}
          onGeometryChange={(geometry) => onUpdateDraft({ geometry_geojson: geometry, geometry_type: geometry ? 'polygon' : 'point' })}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">
          Batal
        </button>
        <button
          type="submit"
          disabled={isUploadingPhoto || isUploadingDocuments || isSavingAsset}
          className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 hover:from-sky-500 hover:to-blue-800 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isUploadingPhoto ? 'Upload Foto...' : isUploadingDocuments ? 'Upload Dokumen...' : isSavingAsset ? 'Simpan Database...' : isOperator ? 'Ajukan ke Admin' : 'Simpan Aset'}
        </button>
      </div>
    </form>
  );
}
