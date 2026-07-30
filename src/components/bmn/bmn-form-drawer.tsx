'use client';

import { FormEvent, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, X } from 'lucide-react';
import { SatkerAutocompleteInput } from '@/components/satker-autocomplete-input';
import type { BmnAssetItem } from '@/lib/types';

const LocationPicker = dynamic(
  () => import('../location-picker').then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-60 place-items-center rounded-2xl border border-gray-200 bg-gray-50 text-xs font-semibold text-secondary">
        Memuat peta pemilihan lokasi...
      </div>
    ),
  }
);

type BmnFormDrawerProps = {
  isOpen: boolean;
  isEditMode: boolean;
  categoryTitle: string;
  defaultJenisBmn: string;
  item: BmnAssetItem | null;
  isSaving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (data: Partial<BmnAssetItem>) => void;
};

export function BmnFormDrawer({
  isOpen,
  isEditMode,
  categoryTitle,
  defaultJenisBmn,
  item,
  isSaving,
  saveError,
  onClose,
  onSave,
}: BmnFormDrawerProps) {
  const [formData, setFormData] = useState<Partial<BmnAssetItem>>({
    jenis_bmn: defaultJenisBmn,
    kode_satker: '',
    nama_satker: '',
    kode_barang: '',
    nup: '',
    nama_barang: '',
    status_bmn: 'Aktif',
    merk: '',
    tipe: '',
    kondisi: 'Baik',
    umur_aset: 0,
    intra_extra: 'Intra',
    henti_guna: 'Tidak',
    status_sbsn: '',
    latitude: null,
    longitude: null,
    alamat_lokasi: '',
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      if (item.latitude || item.longitude || item.alamat_lokasi) {
        setShowLocationPicker(true);
      }
    } else {
      setFormData({
        jenis_bmn: defaultJenisBmn,
        kode_satker: '',
        nama_satker: '',
        kode_barang: '',
        nup: '',
        nama_barang: '',
        status_bmn: 'Aktif',
        merk: '',
        tipe: '',
        kondisi: 'Baik',
        umur_aset: 0,
        intra_extra: 'Intra',
        henti_guna: 'Tidak',
        status_sbsn: '',
        latitude: null,
        longitude: null,
        alamat_lokasi: '',
      });
      setShowLocationPicker(false);
    }
  }, [item, defaultJenisBmn, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-card border border-border p-6 sm:p-8 shadow-2xl flex flex-col justify-between my-auto overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <span className="text-xs font-semibold text-primary bg-info-light px-3 py-1 rounded-full border border-primary/10 mb-1 inline-block">
                {categoryTitle}
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {isEditMode ? 'Edit Data BMN' : 'Tambah Data BMN Baru'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-secondary hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {saveError && (
            <div className="mt-4 rounded-2xl bg-error-light p-3.5 text-xs font-bold text-error-dark border border-error/20">
              {saveError}
            </div>
          )}

          {/* Form */}
          <form id="bmn-form" onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Nama Barang <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nama_barang || ''}
                onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                placeholder="Contoh: Honda Step Wgn / Laptop Lenovo Yoga"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Kode Barang</label>
                <input
                  type="text"
                  value={formData.kode_barang || ''}
                  onChange={(e) => setFormData({ ...formData, kode_barang: e.target.value })}
                  placeholder="Contoh: 3020101003"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">NUP</label>
                <input
                  type="text"
                  value={formData.nup || ''}
                  onChange={(e) => setFormData({ ...formData, nup: e.target.value })}
                  placeholder="Contoh: 1"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            <div>
              <SatkerAutocompleteInput
                label="Satuan Kerja (Satker)"
                value={
                  formData.kode_satker && formData.nama_satker
                    ? `${formData.kode_satker} - ${formData.nama_satker}`
                    : formData.kode_satker || formData.nama_satker || ''
                }
                onChange={(val, item) => {
                  if (item) {
                    setFormData({ ...formData, kode_satker: item.kode_satker, nama_satker: item.nama_satker });
                  } else {
                    setFormData({ ...formData, kode_satker: val, nama_satker: val });
                  }
                }}
                compact
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Merk</label>
                <input
                  type="text"
                  value={formData.merk || ''}
                  onChange={(e) => setFormData({ ...formData, merk: e.target.value })}
                  placeholder="Contoh: Honda / Lenovo"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Tipe</label>
                <input
                  type="text"
                  value={formData.tipe || ''}
                  onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                  placeholder="Contoh: Step Wgn E:HEV / Yoga Slim 7i"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Kondisi</label>
                <select
                  value={formData.kondisi || 'Baik'}
                  onChange={(e) => setFormData({ ...formData, kondisi: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="Baik">Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Status BMN</label>
                <select
                  value={formData.status_bmn || 'Aktif'}
                  onChange={(e) => setFormData({ ...formData, status_bmn: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                  <option value="Usul Hapus">Usul Hapus</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Umur Aset (Tahun)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.umur_aset ?? 0}
                  onChange={(e) => setFormData({ ...formData, umur_aset: Number(e.target.value) })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Intra / Extra</label>
                <select
                  value={formData.intra_extra || 'Intra'}
                  onChange={(e) => setFormData({ ...formData, intra_extra: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="Intra">Intra</option>
                  <option value="Extra">Extra</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Henti Guna</label>
                <select
                  value={formData.henti_guna || 'Tidak'}
                  onChange={(e) => setFormData({ ...formData, henti_guna: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
              </div>
            </div>

            {/* Lokasi Aset Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-foreground">
                  Lokasi Aset BMN
                </label>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{showLocationPicker ? 'Sembunyikan Peta Lokasi' : 'Pilih Lokasi di Peta'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-secondary mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude?.toString() ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="-6.200000"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-secondary mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude?.toString() ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="106.816666"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-secondary mb-1">Alamat / Deskripsi Lokasi</label>
                  <input
                    type="text"
                    value={formData.alamat_lokasi || ''}
                    onChange={(e) => setFormData({ ...formData, alamat_lokasi: e.target.value })}
                    placeholder="Contoh: Gedung A Lt. 2 R. Lab TIK"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Interactive Location Picker Map */}
              {showLocationPicker && (
                <div className="mt-3">
                  <LocationPicker
                    latitude={formData.latitude ?? null}
                    longitude={formData.longitude ?? null}
                    onChange={(lat, lng, label) => {
                      setFormData((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        alamat_lokasi: label ? `${label} - ${prev.alamat_lokasi || ''}`.replace(/ - $/g, '') : prev.alamat_lokasi,
                      }));
                    }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Action Buttons Footer */}
        <div className="mt-6 border-t border-border pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-button border border-border bg-white px-5 py-3 text-xs font-semibold text-secondary hover:bg-muted transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="bmn-form"
            disabled={isSaving}
            className="rounded-button bg-primary px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Tambah Data BMN'}
          </button>
        </div>
      </div>
    </div>
  );
}
