'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Loader2, MapPin, Search } from 'lucide-react';
import { closePolygon, formatArea, polygonAreaM2 } from '@/lib/geo';

type LocationSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  class?: string;
  source?: 'local' | 'osm';
};

type CampusLocation = {
  name: string;
  city: string;
  province: string;
  lat: number;
  lon: number;
  aliases?: string[];
};

const CAMPUS_LOCATIONS: CampusLocation[] = [
  { name: 'Universitas Indonesia', city: 'Depok', province: 'Jawa Barat', lat: -6.3608, lon: 106.8272, aliases: ['UI', 'Kampus UI Depok'] },
  { name: 'Universitas Gadjah Mada', city: 'Sleman', province: 'DI Yogyakarta', lat: -7.7714, lon: 110.3775, aliases: ['UGM'] },
  { name: 'Institut Teknologi Bandung', city: 'Bandung', province: 'Jawa Barat', lat: -6.8915, lon: 107.6107, aliases: ['ITB'] },
  { name: 'Institut Pertanian Bogor', city: 'Bogor', province: 'Jawa Barat', lat: -6.5596, lon: 106.7253, aliases: ['IPB', 'IPB University'] },
  { name: 'Institut Teknologi Sepuluh Nopember', city: 'Surabaya', province: 'Jawa Timur', lat: -7.2817, lon: 112.7952, aliases: ['ITS'] },
  { name: 'Universitas Airlangga', city: 'Surabaya', province: 'Jawa Timur', lat: -7.2699, lon: 112.7584, aliases: ['UNAIR'] },
  { name: 'Universitas Brawijaya', city: 'Malang', province: 'Jawa Timur', lat: -7.9524, lon: 112.6139, aliases: ['UB'] },
  { name: 'Universitas Padjadjaran', city: 'Sumedang', province: 'Jawa Barat', lat: -6.9256, lon: 107.7745, aliases: ['UNPAD', 'Unpad Jatinangor'] },
  { name: 'Universitas Diponegoro', city: 'Semarang', province: 'Jawa Tengah', lat: -7.0507, lon: 110.4406, aliases: ['UNDIP'] },
  { name: 'Universitas Sebelas Maret', city: 'Surakarta', province: 'Jawa Tengah', lat: -7.5586, lon: 110.8565, aliases: ['UNS'] },
  { name: 'Universitas Negeri Yogyakarta', city: 'Sleman', province: 'DI Yogyakarta', lat: -7.7747, lon: 110.3862, aliases: ['UNY'] },
  { name: 'Universitas Negeri Semarang', city: 'Semarang', province: 'Jawa Tengah', lat: -7.0503, lon: 110.3941, aliases: ['UNNES'] },
  { name: 'Universitas Negeri Malang', city: 'Malang', province: 'Jawa Timur', lat: -7.9627, lon: 112.6186, aliases: ['UM', 'Universitas Negeri Malang'] },
  { name: 'Universitas Pendidikan Indonesia', city: 'Bandung', province: 'Jawa Barat', lat: -6.8612, lon: 107.5946, aliases: ['UPI'] },
  { name: 'Universitas Jenderal Soedirman', city: 'Purwokerto', province: 'Jawa Tengah', lat: -7.4096, lon: 109.2448, aliases: ['UNSOED'] },
  { name: 'Universitas Sultan Ageng Tirtayasa', city: 'Serang', province: 'Banten', lat: -6.1179, lon: 106.1539, aliases: ['UNTIRTA'] },
  { name: 'Universitas Lampung', city: 'Bandar Lampung', province: 'Lampung', lat: -5.3644, lon: 105.2401, aliases: ['UNILA'] },
  { name: 'Universitas Sriwijaya', city: 'Indralaya', province: 'Sumatera Selatan', lat: -3.2197, lon: 104.6486, aliases: ['UNSRI'] },
  { name: 'Universitas Bengkulu', city: 'Bengkulu', province: 'Bengkulu', lat: -3.7596, lon: 102.2702, aliases: ['UNIB'] },
  { name: 'Universitas Andalas', city: 'Padang', province: 'Sumatera Barat', lat: -0.9149, lon: 100.4582, aliases: ['UNAND'] },
  { name: 'Universitas Negeri Padang', city: 'Padang', province: 'Sumatera Barat', lat: -0.8979, lon: 100.3509, aliases: ['UNP'] },
  { name: 'Universitas Riau', city: 'Pekanbaru', province: 'Riau', lat: 0.4667, lon: 101.3809, aliases: ['UNRI'] },
  { name: 'Universitas Jambi', city: 'Jambi', province: 'Jambi', lat: -1.6101, lon: 103.5224, aliases: ['UNJA'] },
  { name: 'Universitas Syiah Kuala', city: 'Banda Aceh', province: 'Aceh', lat: 5.5708, lon: 95.3671, aliases: ['USK', 'UNSYIAH'] },
  { name: 'Universitas Sumatera Utara', city: 'Medan', province: 'Sumatera Utara', lat: 3.5626, lon: 98.6576, aliases: ['USU'] },
  { name: 'Universitas Negeri Medan', city: 'Medan', province: 'Sumatera Utara', lat: 3.6121, lon: 98.7136, aliases: ['UNIMED'] },
  { name: 'Universitas Maritim Raja Ali Haji', city: 'Tanjungpinang', province: 'Kepulauan Riau', lat: 0.9167, lon: 104.4578, aliases: ['UMRAH'] },
  { name: 'Universitas Bangka Belitung', city: 'Bangka', province: 'Kepulauan Bangka Belitung', lat: -2.0662, lon: 106.0946, aliases: ['UBB'] },
  { name: 'Universitas Tanjungpura', city: 'Pontianak', province: 'Kalimantan Barat', lat: -0.0553, lon: 109.3454, aliases: ['UNTAN'] },
  { name: 'Universitas Lambung Mangkurat', city: 'Banjarmasin', province: 'Kalimantan Selatan', lat: -3.2947, lon: 114.5842, aliases: ['ULM', 'UNLAM'] },
  { name: 'Universitas Mulawarman', city: 'Samarinda', province: 'Kalimantan Timur', lat: -0.4687, lon: 117.1543, aliases: ['UNMUL'] },
  { name: 'Universitas Palangka Raya', city: 'Palangka Raya', province: 'Kalimantan Tengah', lat: -2.2151, lon: 113.9127, aliases: ['UPR'] },
  { name: 'Universitas Borneo Tarakan', city: 'Tarakan', province: 'Kalimantan Utara', lat: 3.3005, lon: 117.6324, aliases: ['UBT'] },
  { name: 'Universitas Udayana', city: 'Badung', province: 'Bali', lat: -8.7982, lon: 115.1724, aliases: ['UNUD'] },
  { name: 'Universitas Pendidikan Ganesha', city: 'Singaraja', province: 'Bali', lat: -8.1154, lon: 115.0884, aliases: ['UNDIKSHA'] },
  { name: 'Universitas Mataram', city: 'Mataram', province: 'Nusa Tenggara Barat', lat: -8.5865, lon: 116.0956, aliases: ['UNRAM'] },
  { name: 'Universitas Nusa Cendana', city: 'Kupang', province: 'Nusa Tenggara Timur', lat: -10.1561, lon: 123.6673, aliases: ['UNDANA'] },
  { name: 'Universitas Hasanuddin', city: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1331, lon: 119.4881, aliases: ['UNHAS'] },
  { name: 'Universitas Negeri Makassar', city: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1858, lon: 119.4247, aliases: ['UNM Makassar'] },
  { name: 'Universitas Sam Ratulangi', city: 'Manado', province: 'Sulawesi Utara', lat: 1.4576, lon: 124.8262, aliases: ['UNSRAT'] },
  { name: 'Universitas Halu Oleo', city: 'Kendari', province: 'Sulawesi Tenggara', lat: -4.0073, lon: 122.5201, aliases: ['UHO'] },
  { name: 'Universitas Tadulako', city: 'Palu', province: 'Sulawesi Tengah', lat: -0.8377, lon: 119.8922, aliases: ['UNTAD'] },
  { name: 'Universitas Negeri Gorontalo', city: 'Gorontalo', province: 'Gorontalo', lat: 0.5574, lon: 123.0584, aliases: ['UNG'] },
  { name: 'Universitas Sulawesi Barat', city: 'Majene', province: 'Sulawesi Barat', lat: -3.5336, lon: 118.9667, aliases: ['UNSULBAR'] },
  { name: 'Universitas Pattimura', city: 'Ambon', province: 'Maluku', lat: -3.6575, lon: 128.1908, aliases: ['UNPATTI'] },
  { name: 'Universitas Khairun', city: 'Ternate', province: 'Maluku Utara', lat: 0.7862, lon: 127.3841, aliases: ['UNKHAIR'] },
  { name: 'Universitas Cenderawasih', city: 'Jayapura', province: 'Papua', lat: -2.6056, lon: 140.6692, aliases: ['UNCEN'] },
  { name: 'Universitas Papua', city: 'Manokwari', province: 'Papua Barat', lat: -0.8615, lon: 134.064, aliases: ['UNIPA'] },
  { name: 'Universitas Musamus', city: 'Merauke', province: 'Papua Selatan', lat: -8.4932, lon: 140.4038, aliases: ['UNMUS'] },
  { name: 'Universitas Terbuka', city: 'Tangerang Selatan', province: 'Banten', lat: -6.3422, lon: 106.7487, aliases: ['UT'] },
  { name: 'Universitas Islam Negeri Syarif Hidayatullah Jakarta', city: 'Tangerang Selatan', province: 'Banten', lat: -6.3064, lon: 106.7569, aliases: ['UIN Jakarta'] },
  { name: 'Universitas Islam Negeri Sunan Kalijaga', city: 'Yogyakarta', province: 'DI Yogyakarta', lat: -7.7846, lon: 110.3945, aliases: ['UIN Sunan Kalijaga'] },
  { name: 'Universitas Islam Negeri Maulana Malik Ibrahim', city: 'Malang', province: 'Jawa Timur', lat: -7.9517, lon: 112.6073, aliases: ['UIN Malang'] },
  { name: 'Universitas Islam Negeri Alauddin Makassar', city: 'Gowa', province: 'Sulawesi Selatan', lat: -5.2066, lon: 119.5007, aliases: ['UIN Alauddin'] },
  { name: 'Telkom University', city: 'Bandung', province: 'Jawa Barat', lat: -6.9734, lon: 107.6303, aliases: ['Tel-U', 'Universitas Telkom'] },
  { name: 'Universitas Bina Nusantara', city: 'Jakarta', province: 'DKI Jakarta', lat: -6.2018, lon: 106.7816, aliases: ['BINUS', 'Binus University'] },
  { name: 'Universitas Trisakti', city: 'Jakarta', province: 'DKI Jakarta', lat: -6.1678, lon: 106.7906, aliases: ['Trisakti'] },
  { name: 'Universitas Tarumanagara', city: 'Jakarta', province: 'DKI Jakarta', lat: -6.1675, lon: 106.7899, aliases: ['UNTAR'] },
  { name: 'Universitas Pelita Harapan', city: 'Tangerang', province: 'Banten', lat: -6.2288, lon: 106.6097, aliases: ['UPH'] },
  { name: 'Universitas Muhammadiyah Yogyakarta', city: 'Bantul', province: 'DI Yogyakarta', lat: -7.8104, lon: 110.3218, aliases: ['UMY'] },
  { name: 'Universitas Muhammadiyah Malang', city: 'Malang', province: 'Jawa Timur', lat: -7.9218, lon: 112.5985, aliases: ['UMM'] },
  { name: 'Universitas Ahmad Dahlan', city: 'Yogyakarta', province: 'DI Yogyakarta', lat: -7.8333, lon: 110.3833, aliases: ['UAD'] },
];

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function campusToResult(campus: CampusLocation, index: number): LocationSearchResult {
  return {
    place_id: -(index + 1),
    display_name: `${campus.name}, ${campus.city}, ${campus.province}, Indonesia`,
    lat: String(campus.lat),
    lon: String(campus.lon),
    name: campus.name,
    type: 'university',
    class: 'amenity',
    source: 'local',
  };
}

function searchLocalCampuses(keyword: string) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return [];

  return CAMPUS_LOCATIONS
    .map((campus, index) => {
      const haystack = normalizeText([campus.name, campus.city, campus.province, ...(campus.aliases ?? [])].join(' '));
      const score = haystack.includes(normalizedKeyword) ? (normalizeText(campus.name).startsWith(normalizedKeyword) ? 3 : 2) : 0;
      return { result: campusToResult(campus, index), score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.result.display_name.localeCompare(b.result.display_name))
    .map((item) => item.result);
}

function dedupeResults(results: LocationSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${shortName(result).toLowerCase()}|${Number(result.lat).toFixed(4)}|${Number(result.lon).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function FlyToLocation({ position }: { position: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, 17, { duration: 0.8 });
  }, [map, position]);

  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(7)), Number(event.latlng.lng.toFixed(7)));
    },
  });
  return null;
}

function shortName(result: LocationSearchResult) {
  return result.name || result.display_name.split(',')[0] || 'Lokasi Universitas';
}

export function LocationPicker({
  latitude,
  longitude,
  geometry,
  onChange,
  onGeometryChange,
}: {
  latitude: number | null;
  longitude: number | null;
  geometry?: GeoJSON.Geometry | null;
  onChange: (lat: number, lng: number, label?: string) => void;
  onGeometryChange?: (geometry: GeoJSON.Polygon | null, areaM2: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('Ketik nama universitas, kampus, singkatan, atau kota di Indonesia. Contoh: UGM, ITB, Unhas, Telkom University, Jayapura.');
  const [drawingArea, setDrawingArea] = useState(false);
  const [areaPoints, setAreaPoints] = useState<[number, number][]>(() => geometry?.type === 'Polygon' ? geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => [lng, lat]) : []);
  const selectedPosition: LatLngExpression = [latitude ?? -2.5489, longitude ?? 118.0149];
  const draftGeometry = closePolygon(areaPoints);
  const draftArea = polygonAreaM2(draftGeometry);
  const draftPolygon = draftGeometry?.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngExpression) ?? null;

  const localResults = useMemo(() => (query.trim().length >= 2 ? searchLocalCampuses(query).slice(0, 12) : []), [query]);
  const results = useMemo(() => dedupeResults([...localResults, ...remoteResults]).slice(0, 18), [localResults, remoteResults]);

  useEffect(() => {
    if (geometry?.type === 'Polygon') setAreaPoints(geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => [lng, lat]));
    if (!geometry) setAreaPoints([]);
  }, [geometry]);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 3) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchMessage('Mencari lokasi kampus dari daftar internal dan OpenStreetMap...');

      try {
        const searchQueries = Array.from(new Set([
          keyword,
          `${keyword} Indonesia`,
          `${keyword} kampus Indonesia`,
          `${keyword} universitas Indonesia`,
        ]));

        const responses = await Promise.all(searchQueries.map(async (searchQuery) => {
          const params = new URLSearchParams({
            format: 'jsonv2',
            q: searchQuery,
            countrycodes: 'id',
            addressdetails: '1',
            limit: '8',
          });
          const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) throw new Error('Pencarian lokasi gagal.');
          return (await response.json()) as LocationSearchResult[];
        }));

        const data = responses.flat().map((item) => ({ ...item, source: 'osm' as const }));
        const filtered = data.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)));
        setRemoteResults(filtered);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRemoteResults([]);
        setSearchMessage(error instanceof Error ? `${error.message} Daftar internal tetap bisa dipakai.` : 'Pencarian lokasi gagal. Daftar internal tetap bisa dipakai.');
      } finally {
        setIsSearching(false);
      }
    }, 650);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const displayedSearchMessage = isSearching
    ? 'Mencari lokasi kampus dari daftar internal dan OpenStreetMap...'
    : query.trim().length >= 2
      ? results.length > 0
        ? `${results.length} lokasi ditemukan. Hasil bertanda Data kampus berasal dari daftar internal.`
        : searchMessage
      : searchMessage;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      setSearchMessage('Ketik minimal 2 huruf untuk mencari lokasi universitas/kampus di Indonesia.');
    }
  }

  function selectResult(result: LocationSearchResult) {
    const lat = Number(Number(result.lat).toFixed(7));
    const lng = Number(Number(result.lon).toFixed(7));
    onChange(lat, lng, shortName(result));
  }

  function updateAreaPoints(nextPoints: [number, number][]) {
    setAreaPoints(nextPoints);
    const nextGeometry = closePolygon(nextPoints);
    onGeometryChange?.(nextGeometry, polygonAreaM2(nextGeometry));
  }

  function clearArea() {
    setAreaPoints([]);
    setDrawingArea(false);
    onGeometryChange?.(null, null);
  }

  function handleMapPick(lat: number, lng: number) {
    if (drawingArea) {
      updateAreaPoints([...areaPoints, [lng, lat]]);
      if (latitude === null || longitude === null) onChange(lat, lng);
      return;
    }
    onChange(lat, lng);
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5 className="font-black text-slate-900">Pilih Lokasi & Gambar Luasan Aset</h5>
          <p className="mt-1 text-xs font-medium text-slate-500">Cari kampus atau klik peta untuk titik aset. Aktifkan Gambar Luasan untuk marking area/polygon aset.</p>
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-500 lg:w-[28rem]">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <input value={query} onChange={(event) => handleQueryChange(event.target.value)} placeholder="Cari kampus: UGM, ITB, Unhas, Binus, kota..." className="w-full bg-transparent font-medium text-slate-800 outline-none placeholder:text-slate-400" />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDrawingArea((value) => !value)} className={`rounded-full px-3 py-2 text-xs font-black ${drawingArea ? 'bg-amber-100 text-amber-700' : 'bg-sky-600 text-white'}`}>{drawingArea ? 'Selesai Gambar Luasan' : 'Gambar Luasan'}</button>
        <button type="button" onClick={clearArea} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Reset Luasan</button>
        <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">Luas: {formatArea(draftArea)}</span>
        <span className="text-xs font-bold text-slate-500">{drawingArea ? 'Klik minimal 3 titik di peta untuk membentuk polygon.' : 'Mode titik aktif: klik peta mengubah latitude/longitude.'}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-3xl border border-sky-100">
          <MapContainer center={selectedPosition} zoom={latitude && longitude ? 17 : 5} scrollWheelZoom className="h-72 w-full sm:h-80">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyToLocation position={selectedPosition} />
            <ClickHandler onPick={handleMapPick} />
            {latitude !== null && longitude !== null && (
              <CircleMarker center={[latitude, longitude]} radius={12} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0284c7', fillOpacity: 1 }}>
                <Popup>Lokasi aset terpilih</Popup>
              </CircleMarker>
            )}
            {draftPolygon && <Polygon positions={draftPolygon} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.28, weight: 2 }}><Popup>Luasan aset<br />{formatArea(draftArea)}</Popup></Polygon>}
            {areaPoints.map(([lng, lat], index) => <CircleMarker key={`${lng}-${lat}-${index}`} center={[lat, lng]} radius={5} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }} />)}
          </MapContainer>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          <p className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-500">{displayedSearchMessage}</p>
          {latitude !== null && longitude !== null && (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-black text-sky-700">
              Koordinat terpilih: {latitude}, {longitude}
            </div>
          )}
          {areaPoints.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
              Titik luasan: {areaPoints.length} • {draftPolygon ? formatArea(draftArea) : 'minimal 3 titik'}
            </div>
          )}
          {results.map((result) => {
            const lat = Number(Number(result.lat).toFixed(7));
            const lng = Number(Number(result.lon).toFixed(7));
            return (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className={`w-full rounded-2xl border p-3 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50 ${latitude === lat && longitude === lng ? 'border-sky-300 bg-sky-50' : 'border-sky-100 bg-white'}`}
              >
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                  <span>
                    <span className="mb-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">{result.source === 'local' ? 'Data kampus' : 'OpenStreetMap'}</span>
                    <strong className="block text-sm text-slate-900">{shortName(result)}</strong>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{result.display_name}</span>
                    <span className="mt-1 block text-[11px] font-bold text-sky-700">{lat}, {lng}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
