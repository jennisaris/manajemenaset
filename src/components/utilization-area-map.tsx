'use client';

import { useEffect, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Asset, Utilization } from '@/lib/types';
import { closePolygon, formatArea, polygonAreaM2 } from '@/lib/geo';
import { extract6DigitKodeSatker } from '@/lib/satker-utils';

function polygonPositions(geometry: GeoJSON.Geometry | null | undefined): LatLngExpression[] | null {
  if (geometry?.type !== 'Polygon') return null;
  return geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function MapClickCollector({ enabled, points, onChange }: { enabled: boolean; points: [number, number][]; onChange: (points: [number, number][]) => void }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onChange([...points, [event.latlng.lng, event.latlng.lat]]);
    },
  });
  return null;
}

function RecenterMapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 18, { animate: true });
  }, [center, map]);
  return null;
}

export function UtilizationAreaMap({
  asset,
  utilization,
  editable,
  onGeometryChange,
}: {
  asset: Asset | undefined;
  utilization: Utilization | null;
  editable: boolean;
  onGeometryChange?: (geometry: GeoJSON.Polygon | null, areaM2: number | null) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>(() =>
    utilization?.geometry_geojson?.type === 'Polygon'
      ? utilization.geometry_geojson.coordinates[0].slice(0, -1).map(([lng, lat]) => [lng, lat])
      : []
  );
  const [drawing, setDrawing] = useState(false);
  const assetPolygon = polygonPositions(asset?.geometry_geojson);
  const draftGeometry = closePolygon(points);
  const draftPolygon = polygonPositions(draftGeometry);
  const areaM2 = polygonAreaM2(draftGeometry);

  const hasMasterCoords =
    asset?.latitude !== null && asset?.latitude !== undefined && asset?.longitude !== null && asset?.longitude !== undefined;

  const center: LatLngExpression = hasMasterCoords
    ? [asset.latitude!, asset.longitude!]
    : assetPolygon?.[0] ?? [-6.2, 106.816666];

  const satkerCode = extract6DigitKodeSatker(asset?.kode_satker) || asset?.kode_satker || '';
  const assetDisplayName = asset
    ? `${satkerCode ? `[${satkerCode}] ` : ''}${asset.merk || asset.nama_barang || asset.asset_name}`
    : 'Aset';

  function updatePoints(nextPoints: [number, number][]) {
    setPoints(nextPoints);
    const nextGeometry = closePolygon(nextPoints);
    onGeometryChange?.(nextGeometry, polygonAreaM2(nextGeometry));
  }

  function clearArea() {
    setPoints([]);
    setDrawing(false);
    onGeometryChange?.(null, null);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-sky-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-extrabold text-slate-900 text-sm">Area Pemanfaatan di Peta</h5>
            {hasMasterCoords && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                ✓ Auto-Center Master Aset
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {hasMasterCoords
              ? `📍 Posisi Master Aset: ${assetDisplayName} (${asset.latitude}, ${asset.longitude}). Klik "Gambar Area" untuk memetakan luasan di sekeliling posisi ini.`
              : 'Klik "Gambar Area" lalu klik pada peta minimal 3 titik untuk membentuk polygon area pemanfaatan.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="rounded-full bg-sky-50 px-3.5 py-2 text-xs font-black text-[#165DFF] border border-sky-100">
            {formatArea(areaM2 ?? utilization?.utilized_area_m2)}
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => setDrawing((value) => !value)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                drawing
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-[#165DFF] text-white shadow-[#165DFF]/20 hover:bg-[#0E4BD9]'
              }`}
            >
              {drawing ? 'Selesai Gambar' : 'Gambar Area'}
            </button>
          )}
          {editable && (
            <button
              type="button"
              onClick={clearArea}
              className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <MapContainer center={center} zoom={18} scrollWheelZoom={false} className="h-[340px] w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMapController center={center} />
        <MapClickCollector enabled={editable && drawing} points={points} onChange={updatePoints} />

        {/* Master Asset Polygon if exists */}
        {assetPolygon && (
          <Polygon positions={assetPolygon} pathOptions={{ color: '#165DFF', fillColor: '#165DFF', fillOpacity: 0.15, weight: 2 }}>
            <Popup>
              <strong>Polygon Master Aset</strong>
              <br />
              {assetDisplayName}
            </Popup>
          </Polygon>
        )}

        {/* Master Asset Circle Marker & Outer Pulse Circle */}
        {hasMasterCoords && (
          <>
            <CircleMarker
              center={[asset.latitude!, asset.longitude!]}
              radius={18}
              pathOptions={{ color: '#165DFF', weight: 1.5, fillColor: '#165DFF', fillOpacity: 0.2 }}
            />
            <CircleMarker
              center={[asset.latitude!, asset.longitude!]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#165DFF', fillOpacity: 1 }}
            >
              <Popup>
                <div className="text-xs font-sans">
                  <strong className="block text-[#080C1A]">{assetDisplayName}</strong>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Lat: {asset.latitude}, Lng: {asset.longitude}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Draft Utilization Polygon */}
        {draftPolygon && (
          <Polygon positions={draftPolygon} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.35, weight: 2.5 }}>
            <Popup>
              <strong>Area Pemanfaatan Aset</strong>
              <br />
              Luas: {formatArea(areaM2)}
            </Popup>
          </Polygon>
        )}

        {/* Draft Vertex Points */}
        {points.map(([lng, lat], index) => (
          <CircleMarker
            key={`${lng}-${lat}-${index}`}
            center={[lat, lng]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
