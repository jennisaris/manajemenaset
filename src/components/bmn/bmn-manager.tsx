'use client';

import { useEffect, useState } from 'react';
import { BmnDetailModal } from './bmn-detail-modal';
import { BmnFormDrawer } from './bmn-form-drawer';
import { BmnMapModal } from './bmn-map-modal';
import { BmnTable } from './bmn-table';
import type { BmnAssetItem, BmnCategoryType } from '@/lib/types';

type BmnManagerProps = {
  category: BmnCategoryType;
  categoryTitle: string;
  defaultJenisBmn: string;
  isOperator: boolean;
};

export function BmnManager({
  category,
  categoryTitle,
  defaultJenisBmn,
  isOperator,
}: BmnManagerProps) {
  const [items, setItems] = useState<BmnAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<BmnAssetItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [detailItem, setDetailItem] = useState<BmnAssetItem | null>(null);
  const [mapItem, setMapItem] = useState<BmnAssetItem | null>(null);

  const [deletingItem, setDeletingItem] = useState<BmnAssetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    fetchBmnData();
  }, [category]);

  async function fetchBmnData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/bmn/${category}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat data BMN.');
      setItems(json.data || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data BMN.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setIsEditMode(false);
    setEditingItem(null);
    setSaveError('');
    setIsDrawerOpen(true);
  }

  function handleOpenEdit(item: BmnAssetItem) {
    setIsEditMode(true);
    setEditingItem(item);
    setSaveError('');
    setIsDrawerOpen(true);
  }

  function handleOpenDetail(item: BmnAssetItem) {
    setDetailItem(item);
  }

  async function handleSave(data: Partial<BmnAssetItem>) {
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/bmn/${category}`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data.');

      await fetchBmnData();
      setIsDrawerOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bmn/${category}?id=${deletingItem.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus data.');

      await fetchBmnData();
      setDeletingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-card border border-border bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
        <p className="text-sm font-bold text-foreground">Memuat data {categoryTitle}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-error-light p-4 text-xs font-bold text-error-dark border border-error/20">
          {errorMsg}
        </div>
      )}

      <BmnTable
        items={items}
        categoryTitle={categoryTitle}
        isOperator={isOperator}
        onOpenCreate={handleOpenCreate}
        onViewDetail={handleOpenDetail}
        onViewMap={(item) => setMapItem(item)}
        onEdit={handleOpenEdit}
        onDelete={(item) => setDeletingItem(item)}
      />

      <BmnFormDrawer
        isOpen={isDrawerOpen}
        isEditMode={isEditMode}
        categoryTitle={categoryTitle}
        defaultJenisBmn={defaultJenisBmn}
        item={editingItem}
        isSaving={isSaving}
        saveError={saveError}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSave}
      />

      <BmnDetailModal
        item={detailItem}
        categoryTitle={categoryTitle}
        onClose={() => setDetailItem(null)}
      />

      <BmnMapModal
        item={mapItem}
        categoryTitle={categoryTitle}
        onClose={() => setMapItem(null)}
        onViewDetail={(item) => setDetailItem(item)}
      />



      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">Konfirmasi Hapus Data</h3>
            <p className="mt-2 text-xs font-medium text-secondary leading-relaxed">
              Apakah Anda yakin ingin menghapus barang <strong className="text-foreground">{deletingItem.nama_barang}</strong> (NUP: {deletingItem.nup || '-'})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-button border border-border bg-white px-4 py-2.5 text-xs font-semibold text-secondary hover:bg-muted transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-button bg-error px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-error/20 hover:bg-error-dark transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
