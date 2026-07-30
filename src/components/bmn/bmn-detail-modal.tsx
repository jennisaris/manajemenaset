'use client';

import { X } from 'lucide-react';
import type { BmnAssetItem } from '@/lib/types';

type BmnDetailModalProps = {
  item: BmnAssetItem | null;
  categoryTitle: string;
  onClose: () => void;
};

export function BmnDetailModal({ item, categoryTitle, onClose }: BmnDetailModalProps) {
  if (!item) return null;

  const fields = [
    { label: 'Nama Barang', value: item.nama_barang },
    { label: 'Jenis BMN', value: item.jenis_bmn },
    { label: 'Kode Satker', value: item.kode_satker },
    { label: 'Nama Satker', value: item.nama_satker },
    { label: 'Kode Barang', value: item.kode_barang },
    { label: 'NUP', value: item.nup },
    { label: 'Merk', value: item.merk },
    { label: 'Tipe', value: item.tipe },
    { label: 'Kondisi', value: item.kondisi },
    { label: 'Status BMN', value: item.status_bmn },
    { label: 'Umur Aset', value: item.umur_aset ? `${item.umur_aset} Tahun` : '-' },
    { label: 'Intra / Extra', value: item.intra_extra },
    { label: 'Henti Guna', value: item.henti_guna },
    { label: 'Status SBSN', value: item.status_sbsn },
    { label: 'Alamat Lokasi', value: item.alamat_lokasi },
    { label: 'Latitude / Longitude', value: item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : '-' },
  ];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-card border border-border bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="text-xs font-semibold text-primary bg-info-light px-3 py-1 rounded-full border border-primary/10 mb-1 inline-block">
              {categoryTitle}
            </span>
            <h3 className="text-xl font-bold text-foreground">{item.nama_barang}</h3>
            <p className="text-xs text-secondary font-medium">NUP: {item.nup || '-'} | Kode: {item.kode_barang || '-'}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-secondary hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          {fields.map((f, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-muted/60 p-3.5">
              <span className="block text-xs font-semibold text-secondary">{f.label}</span>
              <span className="mt-0.5 block text-sm font-bold text-foreground break-words">
                {f.value || '-'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-button bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
