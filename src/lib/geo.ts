export function polygonAreaM2(geometry: GeoJSON.Geometry | null | undefined): number | null {
  if (geometry?.type !== 'Polygon') return null;
  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;

  const meanLat = ring.reduce((total, [, lat]) => total + lat, 0) / ring.length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((meanLat * Math.PI) / 180);
  const projected = ring.map(([lng, lat]) => ({ x: lng * metersPerDegreeLng, y: lat * metersPerDegreeLat }));

  let twiceArea = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

export function closePolygon(points: [number, number][]): GeoJSON.Polygon | null {
  if (points.length < 3) return null;
  const [firstLng, firstLat] = points[0];
  const [lastLng, lastLat] = points[points.length - 1];
  const isAlreadyClosed = firstLng === lastLng && firstLat === lastLat;
  const ring = isAlreadyClosed ? points : [...points, [firstLng, firstLat] as [number, number]];
  return { type: 'Polygon', coordinates: [ring] };
}

export function formatArea(area: number | null | undefined) {
  if (area === null || area === undefined || Number.isNaN(area)) return '-';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(area)} m²`;
}
