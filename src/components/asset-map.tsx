'use client';

import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import type { Asset, Utilization } from '@/lib/types';
import { formatArea } from '@/lib/geo';

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

export function AssetMap({ assets, utilizations = [] }: { assets: Asset[]; utilizations?: Utilization[] }) {
  return (
    <MapContainer center={indonesiaCenter} zoom={5} minZoom={4} scrollWheelZoom={false} className="h-[360px] w-full rounded-b-[1.5rem] sm:h-[430px] lg:h-[470px]">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {assets.map((asset) => {
        const color = assetColor(asset);
        const polygon = polygonPositions(asset.geometry_geojson);
        if (polygon) {
          return <Polygon key={asset.id} positions={polygon} pathOptions={{ color, fillColor: color, fillOpacity: 0.24, weight: 2 }}><Popup><strong>{asset.asset_name}</strong><br />{asset.asset_code}<br />{asset.campus_name}</Popup></Polygon>;
        }
        if (asset.latitude === null || asset.longitude === null) return null;
        return <CircleMarker key={asset.id} center={[asset.latitude, asset.longitude]} radius={11} pathOptions={{ color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 }}><Popup><strong>{asset.asset_name}</strong><br />Jenis: {asset.asset_type === 'land' ? 'Tanah' : 'Bangunan'}<br />Status: {asset.verification_status.replaceAll('_', ' ')}</Popup></CircleMarker>;
      })}
      {utilizations.map((item) => {
        const polygon = polygonPositions(item.geometry_geojson);
        if (!polygon) return null;
        return <Polygon key={`utilization-${item.id}`} positions={polygon} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.36, weight: 2, dashArray: '6 4' }}><Popup><strong>{item.third_party_name}</strong><br />Pemanfaatan: {item.utilization_type.replaceAll('_', ' ')}<br />Luas: {formatArea(item.utilized_area_m2)}<br />Status: {item.status.replaceAll('_', ' ')}</Popup></Polygon>;
      })}
    </MapContainer>
  );
}
