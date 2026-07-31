/**
 * Mengambil 6 digit Kode Satker resmi dari string Kode Satker full BMN (contoh: 139030100693205000KD -> 693205)
 */
export function extract6DigitKodeSatker(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null;
  const trimmed = rawCode.trim();
  if (/^\d{6}$/.test(trimmed)) return trimmed;

  // Format BMN Kementerian (berawalan 139 dengan panjang >= 15)
  if (trimmed.length >= 15 && trimmed.startsWith('139')) {
    return trimmed.substring(9, 15);
  }

  // Pencarian 6 digit angka yang berawalan digit 6 (standard satker Dikti/PTN/LLDIKTI)
  const matchSix = trimmed.match(/6\d{5}/);
  if (matchSix) return matchSix[0];

  const matchAny = trimmed.match(/\d{6}/);
  if (matchAny) return matchAny[0];

  return trimmed;
}

export function formatSatkerLabel(kodeSatker: string | null | undefined, namaSatker: string | null | undefined): string {
  const code = extract6DigitKodeSatker(kodeSatker);
  if (code && namaSatker) return `[${code}] ${namaSatker}`;
  if (code) return `[${code}]`;
  return namaSatker || '-';
}

export function matchesUniversityScope(asset: { campus_name?: string | null; nama_satker?: string | null; kode_satker?: string | null; asset_code?: string | null }, scope: string | null | undefined): boolean {
  if (!scope || scope === 'all' || !scope.trim()) return true;
  const target = scope.trim().toLowerCase();

  const assetCampus = asset.campus_name?.trim().toLowerCase();
  const assetSatkerName = asset.nama_satker?.trim().toLowerCase();

  // Exact match
  if (assetCampus && assetCampus === target) return true;
  if (assetSatkerName && assetSatkerName === target) return true;

  // Substring / inclusion match (e.g. "693374 - UNIVERSITAS SILIWANGI" matches "UNIVERSITAS SILIWANGI")
  if (assetCampus && target.includes(assetCampus)) return true;
  if (assetCampus && assetCampus.includes(target)) return true;
  if (assetSatkerName && target.includes(assetSatkerName)) return true;

  // 6-digit Kode Satker match (e.g. "693374")
  const code6 = extract6DigitKodeSatker(asset.kode_satker);
  if (code6 && target.includes(code6)) return true;

  // Raw kode_satker or asset_code match
  if (asset.kode_satker && target.includes(asset.kode_satker.toLowerCase())) return true;
  if (asset.asset_code && target.includes(asset.asset_code.toLowerCase())) return true;

  return false;
}

export function getAssetDisplayName(asset: { merk?: string | null; nama_barang?: string | null; asset_name?: string | null }): string {
  if (asset.merk && asset.merk.trim()) return asset.merk.trim();
  if (asset.nama_barang && asset.nama_barang.trim()) return asset.nama_barang.trim();
  return asset.asset_name?.trim() || 'Aset Tanpa Nama';
}
