'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import type { Asset, Utilization } from '@/lib/types';

const AssetMap = dynamic(() => import('./asset-map').then((mod) => mod.AssetMap), {
  ssr: false,
  loading: () => <div className="grid h-[360px] place-items-center rounded-b-[1.5rem] bg-sky-50 text-sm font-bold text-sky-700 sm:h-[430px] lg:h-[470px]">Memuat peta aset...</div>,
});

type FilterKey = 'all' | 'land' | 'building' | 'utilized' | 'issue';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'land', label: 'Tanah' },
  { key: 'building', label: 'Bangunan' },
  { key: 'utilized', label: 'Dimanfaatkan' },
  { key: 'issue', label: 'Bermasalah' },
];

function applyFilter(assets: Asset[], filter: FilterKey) {
  return assets.filter((asset) => {
    if (filter === 'all') return true;
    if (filter === 'land') return asset.asset_type === 'land';
    if (filter === 'building') return asset.asset_type === 'building';
    if (filter === 'utilized') return asset.has_active_utilization;
    if (filter === 'issue') return asset.has_active_issue;
    return true;
  });
}

export function MapCard({
  assets,
  utilizations = [],
  onSelectAsset,
}: {
  assets: Asset[];
  utilizations?: Utilization[];
  onSelectAsset?: (asset: Asset) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const filteredAssets = useMemo(() => applyFilter(assets, activeFilter), [assets, activeFilter]);

  return (
    <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="map-section">
      <div className="flex flex-col gap-3 border-b border-sky-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><MapPinned size={22} /></div>
          <div>
            <h3 className="text-lg font-black">Peta Aset</h3>
            <p className="text-xs font-medium text-slate-500">Menampilkan {filteredAssets.length} dari {assets.length} aset</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {filters.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  active
                    ? 'border-[#165DFF] bg-[#165DFF] text-white shadow-md shadow-[#165DFF]/25 scale-[1.02]'
                    : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6A7686] hover:border-[#165DFF] hover:text-[#165DFF] hover:bg-white'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
      <AssetMap
        assets={filteredAssets}
        utilizations={utilizations.filter((item) => filteredAssets.some((asset) => asset.id === item.asset_id))}
        onSelectAsset={onSelectAsset}
      />
    </section>
  );
}
