'use client';

import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Asset, AssetIssue, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';

const indonesiaCenter: LatLngExpression = [-2.548926, 118.0148634];

function polygonPositions(geometry: GeoJSON.Geometry | null | undefined): LatLngExpression[] | null {
  if (geometry?.type !== 'Polygon') return null;
  return geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function assetColor(asset: Asset) {
  if (asset.has_active_issue) return '#e11d48';
  if (asset.has_active_utilization) return '#0ea5e9';
  if (asset.verification_status === 'menunggu_verifikasi') return '#94a3b8';
  return '#10b981';
}

function FocusMap({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, map, zoom]);
  return null;
}

function assetCenter(asset: Asset | undefined): LatLngExpression | null {
  if (!asset) return null;
  if (asset.latitude !== null && asset.longitude !== null) return [asset.latitude, asset.longitude];
  const polygon = polygonPositions(asset.geometry_geojson);
  return polygon?.[0] ?? null;
}

export function FullPageMap({ assets, utilizations, issues, focusAssetId, focusUtilizationId, focusIssueId }: { assets: Asset[]; utilizations: Utilization[]; issues: AssetIssue[]; focusAssetId?: number; focusUtilizationId?: number; focusIssueId?: number }) {
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const issue = issues.find((item) => item.id === focusIssueId);
  const utilization = utilizations.find((item) => item.id === focusUtilizationId);
  const focusedAsset = assetById.get(focusAssetId ?? issue?.asset_id ?? utilization?.asset_id ?? 0);
  const focusCenter = assetCenter(focusedAsset) ?? indonesiaCenter;
  const focusZoom = focusedAsset ? 17 : 5;

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-900">
      <section className="z-[500] border-b border-sky-100 bg-white/95 px-5 py-4 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Peta Aset Full Page</p>
            <h1 className="text-2xl font-black tracking-[-.04em] text-slate-950">{focusedAsset ? focusedAsset.asset_name : 'Semua Aset'}</h1>
            <p className="text-sm font-semibold text-slate-500">{focusedAsset ? `${focusedAsset.asset_code} • ${focusedAsset.campus_name ?? 'Kampus belum diisi'}` : 'Tampilan seluruh aset, pemanfaatan, dan permasalahan aktif.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            {issue && <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-600">Masalah: {issue.issue_title}</span>}
            {utilization && <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">Pemanfaatan: {utilization.third_party_name}</span>}
            <a href="/" className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">Kembali ke Dashboard</a>
          </div>
        </div>
      </section>
      <section className="relative min-h-0 flex-1">
        <MapContainer center={focusCenter} zoom={focusZoom} minZoom={4} scrollWheelZoom className="h-[calc(100vh-112px)] w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FocusMap center={focusCenter} zoom={focusZoom} />
          {assets.map((asset) => {
            const color = asset.id === focusedAsset?.id ? '#7c3aed' : assetColor(asset);
            const polygon = polygonPositions(asset.geometry_geojson);
            if (polygon) return <Polygon key={asset.id} positions={polygon} pathOptions={{ color, fillColor: color, fillOpacity: asset.id === focusedAsset?.id ? 0.34 : 0.18, weight: asset.id === focusedAsset?.id ? 4 : 2 }}><Popup><strong>{asset.asset_name}</strong><br />{asset.asset_code}<br />{asset.campus_name}<br />{asset.address}</Popup></Polygon>;
            if (asset.latitude === null || asset.longitude === null) return null;
            return <CircleMarker key={asset.id} center={[asset.latitude, asset.longitude]} radius={asset.id === focusedAsset?.id ? 15 : 10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 }}><Popup><strong>{asset.asset_name}</strong><br />{asset.asset_code}<br />Status: {asset.verification_status.replaceAll('_', ' ')}</Popup></CircleMarker>;
          })}
          {utilizations.map((item) => {
            const polygon = polygonPositions(item.geometry_geojson);
            if (!polygon) return null;
            const active = item.id === utilization?.id;
            return <Polygon key={`utilization-${item.id}`} positions={polygon} pathOptions={{ color: active ? '#7c3aed' : '#f59e0b', fillColor: active ? '#7c3aed' : '#f59e0b', fillOpacity: active ? 0.42 : 0.28, weight: active ? 4 : 2, dashArray: '6 4' }}><Popup><strong>{item.third_party_name}</strong><br />Pemanfaatan: {item.utilization_type.replaceAll('_', ' ')}<br />Luas: {formatArea(item.utilized_area_m2)}<br />Status: {item.status.replaceAll('_', ' ')}</Popup></Polygon>;
          })}
        </MapContainer>
      </section>
    </main>
  );
}
