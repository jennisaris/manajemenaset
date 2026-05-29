'use client';

import { useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { Asset, Utilization } from '@/lib/types';
import { closePolygon, formatArea, polygonAreaM2 } from '@/lib/geo';

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

export function UtilizationAreaMap({ asset, utilization, editable, onGeometryChange }: { asset: Asset | undefined; utilization: Utilization | null; editable: boolean; onGeometryChange?: (geometry: GeoJSON.Polygon | null, areaM2: number | null) => void }) {
  const [points, setPoints] = useState<[number, number][]>(() => utilization?.geometry_geojson?.type === 'Polygon' ? utilization.geometry_geojson.coordinates[0].slice(0, -1).map(([lng, lat]) => [lng, lat]) : []);
  const [drawing, setDrawing] = useState(false);
  const assetPolygon = polygonPositions(asset?.geometry_geojson);
  const draftGeometry = closePolygon(points);
  const draftPolygon = polygonPositions(draftGeometry);
  const areaM2 = polygonAreaM2(draftGeometry);
  const center: LatLngExpression = asset?.latitude !== null && asset?.longitude !== null && asset?.latitude !== undefined && asset?.longitude !== undefined
    ? [asset.latitude, asset.longitude]
    : assetPolygon?.[0] ?? [-6.2, 106.816666];

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
      <div className="flex flex-col gap-3 border-b border-sky-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h5 className="font-black text-slate-900">Area Pemanfaatan di Peta</h5><p className="mt-1 text-xs font-semibold text-slate-500">Klik peta minimal 3 titik untuk membentuk polygon. Luas dihitung otomatis.</p></div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">{formatArea(areaM2 ?? utilization?.utilized_area_m2)}</span>
          {editable && <button type="button" onClick={() => setDrawing((value) => !value)} className={`rounded-full px-3 py-2 text-xs font-black ${drawing ? 'bg-amber-100 text-amber-700' : 'bg-sky-600 text-white'}`}>{drawing ? 'Selesai Gambar' : 'Gambar Area'}</button>}
          {editable && <button type="button" onClick={clearArea} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Reset</button>}
        </div>
      </div>
      <MapContainer center={center} zoom={17} scrollWheelZoom={false} className="h-[320px] w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickCollector enabled={editable && drawing} points={points} onChange={updatePoints} />
        {assetPolygon && <Polygon positions={assetPolygon} pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.12, weight: 2 }}><Popup>Polygon aset utama<br />{asset?.asset_name}</Popup></Polygon>}
        {!assetPolygon && asset?.latitude !== null && asset?.longitude !== null && asset?.latitude !== undefined && asset?.longitude !== undefined && <CircleMarker center={[asset.latitude, asset.longitude]} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0ea5e9', fillOpacity: 1 }}><Popup>{asset.asset_name}</Popup></CircleMarker>}
        {draftPolygon && <Polygon positions={draftPolygon} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.34, weight: 2 }}><Popup>Area pemanfaatan<br />{formatArea(areaM2)}</Popup></Polygon>}
        {points.map(([lng, lat], index) => <CircleMarker key={`${lng}-${lat}-${index}`} center={[lat, lng]} radius={5} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }} />)}
      </MapContainer>
    </div>
  );
}
