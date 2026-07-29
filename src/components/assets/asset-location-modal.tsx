'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Eye, Landmark, MapPin, Minimize2, X } from 'lucide-react';
import type { Asset } from '@/lib/types';

const SingleAssetMap = dynamic(() => import('./single-asset-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-sky-400">
      <div className="flex items-center gap-3 text-base font-bold">
        <span className="h-6 w-6 animate-spin rounded-full border-3 border-sky-400 border-t-transparent" />
        Memuat peta interaktif layar penuh (Full Screen)...
      </div>
    </div>
  ),
});

export function AssetLocationModal({
  asset,
  onClose,
  onViewDetail,
}: {
  asset: Asset | null;
  onClose: () => void;
  onViewDetail?: (asset: Asset) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    if (asset) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [asset, onClose]);

  if (!asset) return null;

  const Icon = asset.asset_type === 'land' ? Landmark : Building2;

  const handleOpenDetail = (targetAsset: Asset) => {
    onClose();
    if (onViewDetail) {
      onViewDetail(targetAsset);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white animate-in fade-in duration-200">
      {/* Top Header Bar - Full Screen Style */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-3.5 backdrop-blur-xl shadow-lg z-20">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-md">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-3 py-0.5 text-xs font-black text-sky-300 border border-sky-500/30">
                <Icon className="h-3.5 w-3.5" /> {asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">{asset.asset_code}</span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white leading-tight mt-0.5">{asset.asset_name}</h2>
            <p className="text-xs text-slate-400 font-medium">
              {asset.campus_name || 'Kampus Utama'} • {asset.address || 'Alamat lokasi belum diisi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onViewDetail && (
            <button
              type="button"
              onClick={() => handleOpenDetail(asset)}
              className="inline-flex items-center gap-2 rounded-full bg-[#165DFF] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-600 transition cursor-pointer"
            >
              <Eye className="h-4 w-4" /> Lihat Detail & Slideshow
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-rose-600 hover:border-rose-500 hover:text-white transition shadow-sm cursor-pointer"
            title="Tutup Peta Full Screen (ESC)"
          >
            <Minimize2 className="h-4 w-4" /> Tutup Full Screen
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Peta"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 100% Full Screen Map View Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-slate-900">
        <SingleAssetMap asset={asset} height="h-full" onViewDetail={handleOpenDetail} />
      </main>

      {/* Bottom Metadata Bar */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-slate-900/95 px-6 py-3 text-xs text-slate-300 backdrop-blur-xl z-20 shadow-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Koordinat Latitude</span>
            <strong className="text-white font-mono font-bold text-xs">{asset.latitude !== null ? asset.latitude : 'Belum ditentukan'}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Koordinat Longitude</span>
            <strong className="text-white font-mono font-bold text-xs">{asset.longitude !== null ? asset.longitude : 'Belum ditentukan'}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Kondisi Aset</span>
            <strong className="text-white font-bold">{asset.condition_status || 'Baik'}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Status Legalitas</span>
            <strong className="text-white font-bold">{asset.ownership_status || 'Milik Negara'}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Verifikasi</span>
            <strong className="text-emerald-400 font-bold capitalize">{asset.verification_status || 'terverifikasi'}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Tekan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">ESC</kbd> untuk menutup peta</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-sky-600 px-5 py-2 font-bold text-white shadow-md hover:bg-sky-500 transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </footer>
    </div>
  );
}
