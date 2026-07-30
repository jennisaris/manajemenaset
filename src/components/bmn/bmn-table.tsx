'use client';

import { useMemo, useState } from 'react';
import { Eye, Edit3, Trash2, Search, Plus, MapPin } from 'lucide-react';
import type { BmnAssetItem } from '@/lib/types';

type BmnTableProps = {
  items: BmnAssetItem[];
  categoryTitle: string;
  isOperator: boolean;
  onOpenCreate: () => void;
  onViewDetail: (item: BmnAssetItem) => void;
  onViewMap: (item: BmnAssetItem) => void;
  onEdit: (item: BmnAssetItem) => void;
  onDelete: (item: BmnAssetItem) => void;
};

export function BmnTable({
  items,
  categoryTitle,
  isOperator,
  onOpenCreate,
  onViewDetail,
  onViewMap,
  onEdit,
  onDelete,
}: BmnTableProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [satkerFilter, setSatkerFilter] = useState('ALL');
  const [kondisiFilter, setKondisiFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const satkerOptions = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.nama_satker).filter(Boolean))) as string[];
    return list.sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kode_barang && item.kode_barang.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.nup && item.nup.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.merk && item.merk.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.nama_satker && item.nama_satker.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSatker = satkerFilter === 'ALL' || item.nama_satker === satkerFilter;
      const matchKondisi = kondisiFilter === 'ALL' || item.kondisi === kondisiFilter;

      return matchSearch && matchSatker && matchKondisi;
    });
  }, [items, searchTerm, satkerFilter, kondisiFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Top Header & Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-card border border-border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground">{categoryTitle}</h2>
          <p className="text-xs font-medium text-secondary">
            Total {filteredItems.length} barang terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari barang / kode / NUP / satker..."
              className="w-64 rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-xs font-medium text-foreground placeholder:text-secondary outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Satker Filter */}
          <select
            value={satkerFilter}
            onChange={(e) => {
              setSatkerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 max-w-[200px] truncate transition"
          >
            <option value="ALL">Semua Satker ({satkerOptions.length})</option>
            {satkerOptions.map((sat) => (
              <option key={sat} value={sat}>
                {sat}
              </option>
            ))}
          </select>

          {/* Kondisi Filter */}
          <select
            value={kondisiFilter}
            onChange={(e) => {
              setKondisiFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="ALL">Semua Kondisi</option>
            <option value="Baik">Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>

          {/* Create Button */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Data BMN</span>
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-hidden rounded-card border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-xs font-bold text-secondary">
                <th className="py-4 px-4 w-12 text-center">No</th>
                <th className="py-4 px-4">Nama Barang & Merk/Tipe</th>
                <th className="py-4 px-4">Kode Barang & NUP</th>
                <th className="py-4 px-4">Satuan Kerja (Satker)</th>
                <th className="py-4 px-4 text-center">Kondisi</th>
                <th className="py-4 px-4 text-center">Status BMN</th>
                <th className="py-4 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-medium text-foreground">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary font-semibold">
                    Tidak ada data BMN yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const rowNum = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-muted/50 transition">
                      <td className="py-3.5 px-4 text-center font-bold text-secondary">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{item.nama_barang}</div>
                        <div className="text-[11px] text-secondary">{item.merk || item.tipe ? `${item.merk || ''} ${item.tipe || ''}`.trim() : '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{item.kode_barang || '-'}</div>
                        <div className="text-[11px] text-secondary">NUP: {item.nup || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground max-w-[240px] truncate" title={item.nama_satker || ''}>
                          {item.nama_satker || '-'}
                        </div>
                        <div className="text-[11px] text-secondary">{item.kode_satker || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold ${
                            item.kondisi === 'Baik'
                              ? 'bg-success-light text-success-dark'
                              : item.kondisi === 'Rusak Ringan'
                              ? 'bg-warning-light text-warning-dark'
                              : 'bg-error-light text-error-dark'
                          }`}
                        >
                          {item.kondisi || 'Baik'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block rounded-full bg-card-grey px-3 py-1 text-[11px] font-semibold text-gray-700">
                          {item.status_bmn || 'Aktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewMap(item)}
                            title="Lihat Peta Lokasi Aset"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                          >
                            <MapPin className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewDetail(item)}
                            title="Detail"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            title="Hapus"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-rose-600 hover:text-white hover:border-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-gray-50">
            <span className="text-xs font-semibold text-secondary">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-button border border-border bg-white px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-button border border-border bg-white px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
