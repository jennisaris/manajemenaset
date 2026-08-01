'use client';

import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';

function MapResizeTrigger() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleHashOrResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    };

    window.addEventListener('hashchange', handleHashOrResize);
    window.addEventListener('resize', handleHashOrResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', handleHashOrResize);
      window.removeEventListener('resize', handleHashOrResize);
    };
  }, [map]);

  return null;
}
import type { Asset, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';
import { getAssetDisplayName } from '@/lib/satker-utils';

const indonesiaCenter: LatLngExpression = [-2.548926, 118.0148634];

function assetColor(asset: Asset) {
  if (asset.has_active_issue) return '#e11d48';
  if (asset.has_active_utilization) return '#0ea5e9';
  if (asset.verification_status === 'menunggu_verifikasi') return '#94a3b8';
  return '#10b981';
}

function polygonPositions(geometry: GeoJSON.Geometry | null | undefined): LatLngExpression[] | null {
  if (geometry?.type !== 'Polygon') return null;
  return geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function AssetMapPopup({ asset, onSelectAsset }: { asset: Asset; onSelectAsset?: (asset: Asset) => void }) {
  const displayName = getAssetDisplayName(asset);
  const address = asset.alamat || asset.address || '-';
  const luasBangunan = asset.luas_bangunan ? `${asset.luas_bangunan.toLocaleString('id-ID')} m²` : (asset.asset_type === 'building' ? '-' : 'N/A');
  const statusSertifikasi = asset.status_sertifikasi || asset.ownership_status || '-';
  const photoUrl = asset.primary_photo_url || asset.photo_urls?.[0];
  const photoCount = asset.photo_urls?.length || (asset.primary_photo_url ? 1 : 0);

  return (
    <div className="p-1 text-xs text-slate-700 max-w-[260px] font-sans">
      <strong className="block text-sm font-bold text-slate-900 leading-tight mb-1">{displayName}</strong>
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mb-2">
        <span>{asset.asset_code}</span>
        <span>•</span>
        <span className="font-sans font-semibold text-slate-700">{asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}</span>
      </div>

      <div className="space-y-1 text-xs border-t border-slate-100 pt-1.5">
        <div>
          <span className="font-semibold text-slate-800">Alamat Lokasi:</span>{' '}
          <span className="text-slate-600">{address}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-800">Luas Bangunan:</span>{' '}
          <span className="text-slate-600">{luasBangunan}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-800">Status Sertifikasi:</span>{' '}
          <span className="text-slate-600">{statusSertifikasi}</span>
        </div>
      </div>

      {photoUrl && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-50 p-1.5 border border-slate-200/80">
          <img src={photoUrl} alt={displayName} className="h-10 w-14 rounded-lg object-cover border border-slate-200" />
          <span className="text-[11px] font-bold text-sky-700">📷 {photoCount} Foto Tersedia</span>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-2">
        <a
          href="#asset-list"
          onClick={(e) => {
            if (onSelectAsset) {
              e.preventDefault();
              onSelectAsset(asset);
            }
          }}
          style={{ color: '#ffffff', textDecoration: 'none' }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#165DFF] px-3 py-2 text-[11px] font-extrabold !text-white text-white shadow-sm hover:bg-blue-600 transition cursor-pointer"
        >
          <span style={{ color: '#ffffff' }}>👁️ Lihat Detail & Foto →</span>
        </a>
      </div>
    </div>
  );
}

export function AssetMap({
  assets,
  utilizations = [],
  onSelectAsset,
}: {
  assets: Asset[];
  utilizations?: Utilization[];
  onSelectAsset?: (asset: Asset) => void;
}) {
  return (
    <MapContainer center={indonesiaCenter} zoom={5} minZoom={4} scrollWheelZoom={false} className="h-[360px] w-full rounded-b-[1.5rem] sm:h-[430px] lg:h-[470px]">
      <MapResizeTrigger />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {assets.map((asset) => {
        const color = assetColor(asset);
        const polygon = polygonPositions(asset.geometry_geojson);
        if (polygon) {
          return (
            <Polygon key={asset.id} positions={polygon} pathOptions={{ color, fillColor: color, fillOpacity: 0.24, weight: 2 }}>
              <Popup>
                <AssetMapPopup asset={asset} onSelectAsset={onSelectAsset} />
              </Popup>
            </Polygon>
          );
        }
        if (asset.latitude === null || asset.longitude === null) return null;
        return (
          <CircleMarker key={asset.id} center={[asset.latitude, asset.longitude]} radius={11} pathOptions={{ color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 }}>
            <Popup>
              <AssetMapPopup asset={asset} onSelectAsset={onSelectAsset} />
            </Popup>
          </CircleMarker>
        );
      })}
      {utilizations.map((item) => {
        const polygon = polygonPositions(item.geometry_geojson);
        if (!polygon) return null;
        return (
          <Polygon key={`utilization-${item.id}`} positions={polygon} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.36, weight: 2, dashArray: '6 4' }}>
            <Popup>
              <strong>{item.third_party_name}</strong>
              <br />
              Pemanfaatan: {item.utilization_type.replaceAll('_', ' ')}
              <br />
              Luas: {formatArea(item.utilized_area_m2)}
              <br />
              Status: {item.status.replaceAll('_', ' ')}
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}
