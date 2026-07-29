'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Landmark, Search, X } from 'lucide-react';
import type { Asset } from '@/lib/types';

export function AssetAutocompleteInput({
  assets,
  selectedAssetId,
  onSelectAsset,
  placeholder = 'Ketik kode atau nama aset untuk mencari...',
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
      setQuery(`${selectedAsset.asset_code} — ${selectedAsset.asset_name}`);
    } else {
      setQuery('');
    }
  }, [selectedAsset]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query text to selected asset title if dropdown closed without choosing
        if (selectedAsset) {
          setQuery(`${selectedAsset.asset_code} — ${selectedAsset.asset_name}`);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAsset]);

  // Fast filtered assets (max 25 results to avoid lag)
  const filteredAssets = useMemo(() => {
    if (!query.trim() || (selectedAsset && query === `${selectedAsset.asset_code} — ${selectedAsset.asset_name}`)) {
      return assets.slice(0, 25);
    }
    const cleanQuery = query.toLowerCase().trim();
    return assets
      .filter((asset) => {
        const code = (asset.asset_code || '').toLowerCase();
        const name = (asset.asset_name || '').toLowerCase();
        const campus = (asset.campus_name || '').toLowerCase();
        return code.includes(cleanQuery) || name.includes(cleanQuery) || campus.includes(cleanQuery);
      })
      .slice(0, 25);
  }, [assets, query, selectedAsset]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in duration-150">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span>Pilih Aset (Tampil Maksimal 25 Hasil)</span>
            <span>Total: {assets.length} Aset</span>
          </div>

          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAssetId;
              const Icon = asset.asset_type === 'land' ? Landmark : Building2;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelectAsset(asset.id);
                    setQuery(`${asset.asset_code} — ${asset.asset_name}`);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${asset.asset_type === 'land' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-900">{asset.asset_code}</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate">{asset.campus_name}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate leading-snug">{asset.asset_name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-600" />}
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
