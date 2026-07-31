'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Landmark, Search, X } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';

export function getAssetSatkerMerkLabel(asset: Asset | null | undefined): string {
  if (!asset) return '';
  const satkerCode = extract6DigitKodeSatker(asset.kode_satker) || asset.kode_satker || '-';
  const merkOrName = asset.merk || asset.nama_barang || asset.asset_name || 'Aset';
  return `${satkerCode} - ${merkOrName}`;
}

export function AssetAutocompleteInput({
  assets,
  selectedAssetId,
  onSelectAsset,
  placeholder = 'Ketik kode satker atau merk aset untuk mencari...',
  className = '',
}: {
  assets: Asset[];
  selectedAssetId: number;
  onSelectAsset: (assetId: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected asset instance
  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  // Sync display text when selectedAssetId changes
  useEffect(() => {
    if (selectedAsset) {
      setQuery(getAssetSatkerMerkLabel(selectedAsset));
    } else {
      setQuery('');
    }
  }, [selectedAsset]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query text to selected asset label if dropdown closed without choosing
        if (selectedAsset) {
          setQuery(getAssetSatkerMerkLabel(selectedAsset));
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAsset]);

  // Fast filtered assets (max 25 results to avoid lag)
  const filteredAssets = useMemo(() => {
    const selectedLabel = selectedAsset ? getAssetSatkerMerkLabel(selectedAsset) : '';
    if (!query.trim() || (selectedAsset && query === selectedLabel)) {
      return assets.slice(0, 25);
    }
    const cleanQuery = query.toLowerCase().trim();
    return assets
      .filter((asset) => {
        const satker6 = (extract6DigitKodeSatker(asset.kode_satker) || '').toLowerCase();
        const rawSatker = (asset.kode_satker || '').toLowerCase();
        const merk = (asset.merk || '').toLowerCase();
        const namaBarang = (asset.nama_barang || '').toLowerCase();
        const assetName = (asset.asset_name || '').toLowerCase();
        const assetCode = (asset.asset_code || '').toLowerCase();
        const campus = (asset.campus_name || '').toLowerCase();

        return (
          satker6.includes(cleanQuery) ||
          rawSatker.includes(cleanQuery) ||
          merk.includes(cleanQuery) ||
          namaBarang.includes(cleanQuery) ||
          assetName.includes(cleanQuery) ||
          assetCode.includes(cleanQuery) ||
          campus.includes(cleanQuery)
        );
      })
      .slice(0, 25);
  }, [assets, query, selectedAsset]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-[#E5E7EB] bg-white pl-10 pr-9 py-2.5 text-xs font-semibold text-[#080C1A] placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#165DFF] focus:ring-4 focus:ring-[#165DFF]/10 shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Options List - Modern Template */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-2 shadow-2xl animate-in fade-in duration-200 ring-1 ring-black/5">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span>Pilih Aset (Tampil Maksimal 25 Hasil)</span>
            <span className="font-mono text-slate-500">{assets.length} Aset</span>
          </div>

          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAssetId;
              const Icon = asset.asset_type === 'land' ? Landmark : Building2;
              const satkerCode = extract6DigitKodeSatker(asset.kode_satker) || asset.kode_satker || '-';
              const displayMerk = asset.merk || asset.nama_barang || asset.asset_name;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelectAsset(asset.id);
                    setQuery(getAssetSatkerMerkLabel(asset));
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 cursor-pointer mb-1 ${
                    isSelected
                      ? 'bg-[#165DFF]/10 text-[#165DFF] font-bold border border-[#165DFF]/20'
                      : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${asset.asset_type === 'land' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-sky-50 text-[#165DFF] border border-sky-100'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold font-mono text-white tracking-wide">
                          {satkerCode}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#080C1A] truncate">{displayMerk}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                        {asset.asset_code} • {asset.campus_name || 'Universitas'}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#165DFF]" />}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 italic">
              Tidak ada aset yang cocok dengan pencarian &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
