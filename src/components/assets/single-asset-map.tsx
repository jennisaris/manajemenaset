'use client';

import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Asset } from '@/lib/types';
import { formatArea, polygonAreaM2 } from '@/lib/geo';
import 'leaflet/dist/leaflet.css';

function polygonPositions(geometry: GeoJSON.Geometry | null | undefined): LatLngExpression[] | null {
  if (geometry?.type !== 'Polygon') return null;
  return geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function FocusMap({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      const container = map.getContainer();
      if (container && container.ownerDocument && container.ownerDocument.contains(container)) {
        map.flyTo(center, zoom, { duration: 0.8 });
      }
    } catch {
      // Safe fallback if map instance or container was destroyed
    }
  }, [center, map, zoom]);
  return null;
}

export default function SingleAssetMap({
  asset,
  height = 'h-72',
  onViewDetail,
}: {
  asset: Asset;
  height?: string;
  onViewDetail?: (asset: Asset) => void;
}) {
  const center: LatLngExpression = useMemo(() => {
    if (asset.latitude !== null && asset.longitude !== null && !isNaN(Number(asset.latitude)) && !isNaN(Number(asset.longitude))) {
      return [Number(asset.latitude), Number(asset.longitude)];
    }
    const polygon = polygonPositions(asset.geometry_geojson);
    if (polygon && polygon.length > 0) {
      return polygon[0];
    }
    return [-2.548926, 118.0148634]; // Indonesia default center
  }, [asset]);

  const hasLocation = Boolean(
    (asset.latitude !== null && asset.longitude !== null) ||
    (asset.geometry_geojson && asset.geometry_geojson.type === 'Polygon')
  );

  const polygonCoords = polygonPositions(asset.geometry_geojson);
  const areaM2 = asset.geometry_geojson?.type === 'Polygon' ? polygonAreaM2(asset.geometry_geojson as GeoJSON.Polygon) : null;
  const zoom = hasLocation ? 17 : 5;

  return (
    <div className={`relative w-full ${height} overflow-hidden bg-slate-900`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FocusMap center={center} zoom={zoom} />

        {/* Marker Point */}
        {asset.latitude !== null && asset.longitude !== null && (
          <CircleMarker
            center={[Number(asset.latitude), Number(asset.longitude)]}
            radius={9}
            pathOptions={{
              fillColor: asset.asset_type === 'land' ? '#10b981' : '#165dff',
              fillOpacity: 0.9,
              color: '#ffffff',
              weight: 3,
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <strong className="block font-bold text-slate-900 text-sm">{asset.asset_name}</strong>
                <span className="text-slate-500 font-mono">{asset.asset_code}</span>
                <p className="mt-1 font-semibold text-sky-700">{asset.campus_name || 'Kampus Utama'}</p>
                <p className="text-slate-600">{asset.address || 'Alamat belum diisi'}</p>
                {onViewDetail && (
                  <button
                    type="button"
                    onClick={() => onViewDetail(asset)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#165DFF] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                  >
                    👁️ Lihat Detail & Slideshow
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Luasan Polygon */}
        {polygonCoords && polygonCoords.length > 0 && (
          <Polygon
            positions={polygonCoords}
            pathOptions={{
              fillColor: asset.asset_type === 'land' ? '#10b981' : '#165dff',
              fillOpacity: 0.3,
              color: asset.asset_type === 'land' ? '#059669' : '#1d4ed8',
              weight: 3,
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <strong className="block font-bold text-slate-900">Area Luasan Aset</strong>
                <span className="font-bold text-sky-700 block">{formatArea(areaM2)}</span>
                {onViewDetail && (
                  <button
                    type="button"
                    onClick={() => onViewDetail(asset)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#165DFF] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                  >
                    👁️ Lihat Detail & Slideshow
                  </button>
                )}
              </div>
            </Popup>
          </Polygon>
        )}
      </MapContainer>

      {/* Info Badge Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 backdrop-blur-md shadow-md text-xs font-semibold text-slate-800">
        <span className="flex items-center gap-1 text-sky-600 font-bold">
          📍 {asset.latitude && asset.longitude ? `${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}` : 'Lokasi Peta'}
        </span>
        {areaM2 ? <span className="rounded-md bg-sky-50 px-2 py-0.5 font-bold text-sky-700">Luas: {formatArea(areaM2)}</span> : null}
      </div>
    </div>
  );
}
