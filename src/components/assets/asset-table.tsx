import { BadgeCheck, Building2, Eye, FileText, Image as ImageIcon, Landmark, MapPin, Pencil, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import type { Asset, VerificationStatus } from '@/lib/types';
import { extract6DigitKodeSatker, getAssetDisplayName } from '@/lib/satker-utils';
import { StatusBadge } from './asset-status-badge';

type AssetTableProps = {
  items: Asset[];
  canManage: boolean;
  canApprove: boolean;
  deletingAssetId: number | null;
  onView: (asset: Asset) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onUpdateVerification: (asset: Asset, status: VerificationStatus) => void;
  onMapClick?: (asset: Asset) => void;
};

export function AssetTable({
  items,
  canManage,
  canApprove,
  deletingAssetId,
  onView,
  onEdit,
  onDelete,
  onUpdateVerification,
  onMapClick,
}: AssetTableProps) {
  if (items.length === 0) {
    return (
      <div className="grid place-items-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF2F7] text-[#165DFF]">
          <Landmark className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-bold text-[#080C1A]">Tidak ada data aset yang ditemukan</p>
        <p className="mt-1 text-xs text-[#6A7686]">Coba ubah kata kunci pencarian atau filter pilihan Anda.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="grid gap-4 p-4 lg:hidden">
        {items.map((asset) => {
          const Icon = asset.asset_type === 'land' ? Landmark : Building2;
          const photoCount = asset.photo_urls?.length || (asset.primary_photo_url ? 1 : 0);
          const docCount = asset.document_urls?.length || asset.document_paths?.length || 0;

          return (
            <article key={asset.id} className="rounded-[20px] border border-[#F3F4F3] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {asset.primary_photo_url ? (
                    <img
                      src={asset.primary_photo_url}
                      alt={asset.asset_name}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover border border-[#F3F4F3]"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF2F7] text-[#165DFF]">
                      <Icon className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-[#080C1A] leading-tight">{getAssetDisplayName(asset)}</h4>
                    <p className="mt-0.5 text-xs font-medium text-[#6A7686]">{asset.asset_code}</p>
                  </div>
                </div>
                <StatusBadge status={asset.verification_status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#6A7686] border-t border-[#F3F4F3] pt-3">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[#6A7686]">Tipe & Lokasi</span>
                  <strong className="text-[#080C1A] font-bold">
                    {asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}
                  </strong>
                  <span className="block truncate">
                    {asset.kode_satker ? <span className="font-extrabold text-[#165DFF] mr-1">[{extract6DigitKodeSatker(asset.kode_satker)}]</span> : null}
                    {asset.campus_name || asset.nama_satker || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-[#6A7686]">Kondisi & Legalitas</span>
                  <strong className="text-[#080C1A] font-bold">{asset.condition_status || 'Baik'}</strong>
                  <span className="block truncate">{asset.ownership_status || 'Milik Univ'}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#F3F4F3] pt-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-[#6A7686]">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5 text-[#165DFF]" /> {photoCount} Foto
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-[#165DFF]" /> {docCount} Dokumen
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onMapClick ? onMapClick(asset) : onView(asset)}
                    title="Lihat Peta Lokasi Aset"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onView(asset)}
                    title="Lihat Detail Aset"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {canApprove && asset.verification_status === 'menunggu_verifikasi' && (
                    <>
                      <button
                        onClick={() => onUpdateVerification(asset, 'terverifikasi')}
                        title="Verifikasi Aset"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onUpdateVerification(asset, 'revisi')}
                        title="Minta Revisi"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-amber-600 hover:text-white hover:border-amber-600 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => onEdit(asset)}
                        title="Edit Aset"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(asset)}
                        disabled={deletingAssetId === asset.id}
                        title="Hapus Aset"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-rose-600 hover:text-white hover:border-rose-600 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop Table Layout - 6 Explicit Columns */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[#F3F4F3] bg-[#F9FAFB] text-[11px] font-bold uppercase tracking-wider text-[#6A7686]">
            <tr>
              <th className="px-5 py-3.5">Nama Aset</th>
              <th className="px-5 py-3.5">Tipe & Lokasi</th>
              <th className="px-5 py-3.5">Kondisi & Kepemilikan</th>
              <th className="px-5 py-3.5">Media & Dokumen</th>
              <th className="px-5 py-3.5 text-center">Status Verifikasi</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F3]">
            {items.map((asset) => {
              const Icon = asset.asset_type === 'land' ? Landmark : Building2;
              const photoCount = asset.photo_urls?.length || (asset.primary_photo_url ? 1 : 0);
              const docCount = asset.document_urls?.length || asset.document_paths?.length || 0;
              const displayName = getAssetDisplayName(asset);

              return (
                <tr key={asset.id} className="transition hover:bg-[#F9FAFB]/80">
                  {/* Column 1: Nama Aset */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {asset.primary_photo_url ? (
                        <img
                          src={asset.primary_photo_url}
                          alt={displayName}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover border border-[#F3F4F3] shadow-xs"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF2F7] text-[#165DFF]">
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <strong className="block font-bold text-[#080C1A]">{displayName}</strong>
                        <span className="text-xs font-medium text-[#6A7686]">{asset.asset_code}</span>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Tipe & Lokasi */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF2F7] px-2 py-0.5 text-[11px] font-bold text-[#165DFF] mb-1">
                      {asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}
                    </span>
                    <p className="text-xs font-semibold text-[#080C1A]">
                      {asset.kode_satker ? <span className="text-[#165DFF] font-extrabold mr-1">[{extract6DigitKodeSatker(asset.kode_satker)}]</span> : null}
                      {asset.campus_name || asset.nama_satker || '-'}
                    </p>
                    <p className="text-[11px] text-[#6A7686] truncate max-w-48">{asset.faculty_or_unit || '-'}</p>
                  </td>

                  {/* Column 3: Kondisi & Kepemilikan */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      asset.condition_status === 'Baik' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {asset.condition_status || 'Baik'}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-[#080C1A]">{asset.ownership_status || 'Milik Universitas'}</p>
                  </td>

                  {/* Column 4: Media & Dokumen */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-xs font-semibold text-[#080C1A]">
                      <span className="inline-flex items-center gap-1.5 text-[#6A7686]">
                        <ImageIcon className="h-3.5 w-3.5 text-[#165DFF]" />
                        <strong className="text-[#080C1A]">{photoCount}</strong> Foto
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#6A7686]">
                        <FileText className="h-3.5 w-3.5 text-[#165DFF]" />
                        <strong className="text-[#080C1A]">{docCount}</strong> Dokumen
                      </span>
                    </div>
                  </td>

                  {/* Column 5: Status Verifikasi */}
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={asset.verification_status} />
                  </td>

                  {/* Column 6: Aksi */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onMapClick ? onMapClick(asset) : onView(asset)}
                        title="Lihat Peta Lokasi Aset (Layar Besar)"
                        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onView(asset)}
                        title="Lihat Detail Aset"
                        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {canApprove && asset.verification_status === 'menunggu_verifikasi' && (
                        <>
                          <button
                            onClick={() => onUpdateVerification(asset, 'terverifikasi')}
                            title="Setujui Verifikasi Aset"
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-600/20 active:scale-95 cursor-pointer"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onUpdateVerification(asset, 'revisi')}
                            title="Minta Revisi Aset"
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 hover:shadow-md hover:shadow-amber-600/20 active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {canManage && (
                        <>
                          <button
                            onClick={() => onEdit(asset)}
                            title="Edit Aset"
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] hover:shadow-md hover:shadow-[#165DFF]/20 active:scale-95 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(asset)}
                            disabled={deletingAssetId === asset.id}
                            title="Hapus Aset"
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
