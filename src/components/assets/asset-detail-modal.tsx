import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BadgeCheck, Eye, FileText, ImageIcon, MapPin, Maximize2, RotateCcw, X } from 'lucide-react';
import { createAssetDocumentPreviewUrl } from '@/lib/storage';
import type { Asset, VerificationStatus } from '@/lib/types';
import { normalizeStatus } from './asset-status-badge';
import { ImageSlideshow, SlideshowItem } from './image-slideshow';

const SingleAssetMap = dynamic(() => import('./single-asset-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-900 text-sky-400">
      <span className="text-xs font-semibold">Memuat peta lokasi aset...</span>
    </div>
  ),
});

export type DocumentPreview = {
  name: string;
  url?: string | null;
  mimeType?: string;
};

type AssetDetailModalProps = {
  viewingAsset: Asset;
  canApprove: boolean;
  previewPhoto: DocumentPreview | null;
  previewDocument: DocumentPreview | null;
  onClose: () => void;
  onOpenPhotoPreview: (name: string, url?: string | null, path?: string | null) => void;
  onOpenDocumentPreview: (name: string, url?: string | null, path?: string | null) => void;
  onClosePhotoPreview: () => void;
  onCloseDocumentPreview: () => void;
  onUpdateVerificationStatus: (asset: Asset, status: VerificationStatus) => void;
  onOpenLargeMap?: (asset: Asset) => void;
};

export function AssetDetailModal({
  viewingAsset,
  canApprove,
  previewPhoto,
  previewDocument,
  onClose,
  onOpenPhotoPreview,
  onOpenDocumentPreview,
  onClosePhotoPreview,
  onCloseDocumentPreview,
  onUpdateVerificationStatus,
  onOpenLargeMap,
}: AssetDetailModalProps) {
  const slideshowItems: SlideshowItem[] = useMemo(() => {
    if (viewingAsset.photo_names && viewingAsset.photo_names.length > 0) {
      return viewingAsset.photo_names
        .map((name, index) => ({
          name,
          url: viewingAsset.photo_urls?.[index] ?? (index === 0 ? viewingAsset.primary_photo_url : null) ?? '',
        }))
        .filter((item) => Boolean(item.url));
    }
    if (viewingAsset.primary_photo_url) {
      return [{ name: viewingAsset.asset_name, url: viewingAsset.primary_photo_url }];
    }
    return [];
  }, [viewingAsset]);

  const activePhotoIndex = useMemo(() => {
    if (!previewPhoto) return 0;
    const index = slideshowItems.findIndex((item) => item.name === previewPhoto.name);
    return index >= 0 ? index : 0;
  }, [previewPhoto, slideshowItems]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#F3F4F3] bg-white p-6 shadow-xs" id="asset-detail-page">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#F3F4F3] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onClose}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#165DFF] hover:underline cursor-pointer"
          >
            ← Kembali ke Data Aset Universitas
          </button>
          <span className="inline-block rounded-full bg-[#165DFF]/10 px-3 py-1 text-[11px] font-bold text-[#165DFF] mb-1">
            {viewingAsset.verification_status === 'menunggu_verifikasi' ? 'Usulan Data Aset Baru' : 'Detail Aset Terdaftar'}
          </span>
          <h3 className="text-xl font-bold text-[#080C1A]">{viewingAsset.asset_name}</h3>
          <p className="mt-0.5 text-xs font-medium text-[#6A7686]">
            {viewingAsset.asset_code} • {viewingAsset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && viewingAsset.verification_status === 'menunggu_verifikasi' && (
            <button
              type="button"
              onClick={() => onUpdateVerificationStatus(viewingAsset, 'terverifikasi')}
              className="inline-flex items-center gap-1.5 rounded-[50px] bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <BadgeCheck className="h-4 w-4" /> Approve
            </button>
          )}
          {canApprove && viewingAsset.verification_status === 'menunggu_verifikasi' && (
            <button
              type="button"
              onClick={() => onUpdateVerificationStatus(viewingAsset, 'revisi')}
              className="inline-flex items-center gap-1.5 rounded-[50px] bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition"
            >
              <RotateCcw className="h-4 w-4" /> Minta Revisi
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6A7686] hover:bg-[#F3F4F3] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary Detail Grid */}
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['Kampus', viewingAsset.campus_name],
          ['Unit / Fakultas', viewingAsset.faculty_or_unit],
          ['Alamat Lokasi', viewingAsset.address],
          ['Kepemilikan', viewingAsset.ownership_status],
          ['Kondisi Aset', viewingAsset.condition_status],
          ['Status Verifikasi', normalizeStatus(viewingAsset.verification_status)],
          ['Latitude', viewingAsset.latitude?.toString()],
          ['Longitude', viewingAsset.longitude?.toString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#F3F4F3] bg-[#F9FAFB] p-4">
            <p className="text-[11px] font-semibold text-[#6A7686]">{label}</p>
            <p className="mt-1 text-xs font-bold text-[#080C1A]">{value || '-'}</p>
          </div>
        ))}
      </div>

      {/* Map Section (Medium Size) */}
      <div className="mt-6 rounded-[20px] border border-sky-100 bg-sky-50/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h5 className="flex items-center gap-2 font-bold text-[#080C1A] text-sm">
              <MapPin className="h-4 w-4 text-[#165DFF]" /> Lokasi & Peta Aset (Tampilan Sedang)
            </h5>
            <p className="mt-0.5 text-xs text-[#6A7686]">Posisi koordinat dan luasan polygon area aset di peta.</p>
          </div>
          {onOpenLargeMap && (
            <button
              type="button"
              onClick={() => onOpenLargeMap(viewingAsset)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#165DFF] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Perbesar Peta (Layar Besar)
            </button>
          )}
        </div>
        <SingleAssetMap asset={viewingAsset} height="h-72 sm:h-80" />
      </div>

      {/* Attachments Section */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[20px] border border-[#F3F4F3] bg-[#F9FAFB] p-5">
          <h5 className="flex items-center gap-2 font-bold text-[#080C1A] text-sm">
            <ImageIcon className="h-4 w-4 text-[#165DFF]" /> Foto Dokumentasi Aset ({slideshowItems.length})
          </h5>
          {slideshowItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {slideshowItems.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() => onOpenPhotoPreview(item.name, item.url, null)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-left text-xs font-semibold text-[#080C1A] transition hover:border-[#165DFF]"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="inline-flex items-center gap-1 text-[#165DFF] font-bold shrink-0">
                    <Eye className="h-3.5 w-3.5" /> Slideshow Foto
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs font-medium text-[#6A7686]">Belum ada foto aset yang diupload.</p>
          )}
        </div>

        <div className="rounded-[20px] border border-[#F3F4F3] bg-[#F9FAFB] p-5">
          <h5 className="flex items-center gap-2 font-bold text-[#080C1A] text-sm">
            <FileText className="h-4 w-4 text-[#165DFF]" /> Dokumen Pendukung & Legalitas
          </h5>
          {(viewingAsset.document_names?.length ?? 0) > 0 ? (
            <div className="mt-3 space-y-2">
              {viewingAsset.document_names?.map((name, index) => {
                const url = viewingAsset.document_urls?.[index] || (viewingAsset.document_paths?.[index] ? createAssetDocumentPreviewUrl(viewingAsset.document_paths[index]) : null);
                return (
                  <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#080C1A]">
                    <button
                      type="button"
                      onClick={() => onOpenDocumentPreview(name, url, viewingAsset.document_paths?.[index])}
                      className="min-w-0 flex-1 truncate text-left hover:text-[#165DFF]"
                    >
                      {name}
                    </button>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[#165DFF] font-bold">
                        <Eye className="h-3.5 w-3.5" /> Buka
                      </a>
                    ) : (
                      <span className="shrink-0 text-[#6A7686]">File lokal</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-xs font-medium text-[#6A7686]">Belum ada dokumen pendukung yang diupload.</p>
          )}
        </div>
      </div>

      {/* Photo Slideshow Showcase */}
      {previewPhoto?.url && slideshowItems.length > 0 && (
        <ImageSlideshow
          items={slideshowItems}
          initialIndex={activePhotoIndex}
          onClose={onClosePhotoPreview}
        />
      )}

      {/* Document Preview Panel */}
      {previewDocument?.url && (
        <div className="mt-6 rounded-[20px] border border-[#F3F4F3] bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h5 className="font-bold text-[#080C1A] text-sm">Preview Dokumen</h5>
              <p className="mt-0.5 text-xs text-[#6A7686]">{previewDocument.name}</p>
            </div>
            <button
              type="button"
              onClick={onCloseDocumentPreview}
              className="grid h-8 w-8 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6A7686]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <a href={previewDocument.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-[50px] bg-[#165DFF]/10 px-4 py-2 text-xs font-semibold text-[#165DFF]">
              <Eye className="h-4 w-4" /> Buka/Unduh Dokumen di Tab Baru
            </a>
          </div>
          {previewDocument.mimeType?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewDocument.url} alt={previewDocument.name} className="max-h-[500px] w-full rounded-2xl border border-[#F3F4F3] object-contain bg-[#F9FAFB]" />
          ) : previewDocument.mimeType === 'application/pdf' ? (
            <iframe title={`Preview ${previewDocument.name}`} src={previewDocument.url} className="h-[500px] w-full rounded-2xl border border-[#F3F4F3] bg-[#F9FAFB]" />
          ) : (
            <div className="rounded-2xl border border-[#F3F4F3] bg-[#F9FAFB] p-4 text-xs font-semibold text-[#6A7686]">
              Format dokumen tidak dapat ditampilkan langsung di browser. Silakan klik tombol buka di atas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
