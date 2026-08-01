import * as XLSX from 'xlsx';
import type { Asset, AssetIssue, BmnDisposalProposal, Utilization } from './types';

function formatRupiah(num?: number | null): string {
  if (num === undefined || num === null || Number.isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function mapUtilizationRows(utilizations: Utilization[] = [], assets: Asset[] = []) {
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeUtilizations = Array.isArray(utilizations) ? utilizations : [];
  const assetMap = new Map(safeAssets.map((a) => [a.id, a]));

  return safeUtilizations.map((item, index) => {
    const asset = assetMap.get(item.asset_id);
    const namaAset = asset
      ? asset.merk
        ? `${asset.merk} (${asset.asset_name || asset.nama_barang || ''})`
        : asset.asset_name || asset.nama_barang || '-'
      : `Aset #${item.asset_id}`;

    return {
      'No': index + 1,
      'Kode Satker': asset?.kode_satker || asset?.campus_name || '-',
      'Nama Satker / PTN': asset?.nama_satker || asset?.campus_name || '-',
      'Kode Barang': asset?.kode_barang || asset?.asset_code || '-',
      'NUP': asset?.nup || '-',
      'Nama Aset': namaAset,
      'Jenis Pemanfaatan': item.utilization_type || '-',
      'Nama Mitra / Pihak Ke-3': item.third_party_name || '-',
      'Luas Pemanfaatan (m²)': item.utilized_area_m2 ?? '-',
      'Tanggal Mulai': formatDate(item.start_date),
      'Tanggal Selesai': formatDate(item.end_date),
      'Dokumen PKS': item.pks_document_name || '-',
      'Status Kontrak': item.status === 'aktif' ? 'Aktif' : item.status === 'akan_berakhir' ? 'Akan Berakhir' : item.status === 'selesai' ? 'Selesai' : item.status || '-',
    };
  });
}

function mapIssueRows(issues: AssetIssue[] = [], assets: Asset[] = []) {
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeIssues = Array.isArray(issues) ? issues : [];
  const assetMap = new Map(safeAssets.map((a) => [a.id, a]));

  return safeIssues.map((issue, index) => {
    const asset = assetMap.get(issue.asset_id);
    const namaAset = asset
      ? asset.merk
        ? `${asset.merk} (${asset.asset_name || asset.nama_barang || ''})`
        : asset.asset_name || asset.nama_barang || '-'
      : `Aset #${issue.asset_id}`;

    return {
      'No': index + 1,
      'Kode Satker': asset?.kode_satker || asset?.campus_name || '-',
      'Nama Satker / PTN': asset?.nama_satker || asset?.campus_name || '-',
      'Kode Barang': asset?.kode_barang || asset?.asset_code || '-',
      'NUP': asset?.nup || '-',
      'Nama Aset': namaAset,
      'Judul Permasalahan': issue.issue_title || '-',
      'Jenis Permasalahan': issue.issue_type || '-',
      'Prioritas': issue.priority === 'tinggi' ? 'Tinggi' : issue.priority === 'sedang' ? 'Sedang' : issue.priority === 'rendah' ? 'Rendah' : issue.priority || '-',
      'Tanggal Kejadian': formatDate(issue.found_date),
      'Status Penanganan': issue.status === 'selesai' ? 'Selesai' : issue.status === 'proses' ? 'Proses Penanganan' : 'Terbuka / Menunggu',
    };
  });
}

function mapDisposalRows(proposals: BmnDisposalProposal[] = []) {
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  return safeProposals.map((prop, index) => {
    const statusStr =
      prop.status === 'disetujui'
        ? 'Disetujui'
        : prop.status === 'ditolak'
        ? 'Ditolak'
        : 'Menunggu Verifikasi';

    return {
      'No': index + 1,
      'Kode Satker': prop.kode_satker || '-',
      'Nama Satker / PTN': prop.nama_satker || '-',
      'No. Surat Permohonan': prop.no_surat_permohonan || '-',
      'Jenis Barang / Uraian': prop.jenis_barang || '-',
      'Jumlah Barang (Unit)': prop.jumlah_barang || 0,
      'Total Nilai Perolehan': formatRupiah(prop.nilai_perolehan),
      'Tanggal Pengajuan': formatDate(prop.created_at),
      'Status Verifikasi BMN': statusStr,
      'Catatan / Alasan': prop.catatan || '-',
    };
  });
}

function autoFitColumns(worksheet: XLSX.WorkSheet, jsonRows: Record<string, any>[]) {
  if (!jsonRows || jsonRows.length === 0) return;
  const keys = Object.keys(jsonRows[0]);
  const colWidths = keys.map((key) => {
    let maxLen = key.length;
    jsonRows.forEach((row) => {
      const valStr = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet['!cols'] = colWidths;
}

/**
 * Ekspor Laporan Pemanfaatan Aset ke Excel
 */
export function exportUtilizationsToExcel(utilizations: Utilization[] = [], assets: Asset[] = [], filenamePrefix = 'Laporan_Pemanfaatan_Aset') {
  const rows = mapUtilizationRows(utilizations, assets);
  const worksheetRows = rows.length > 0 ? rows : [{ Status: 'Tidak ada data pemanfaatan aset' }];
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
  if (rows.length > 0) autoFitColumns(worksheet, rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pemanfaatan Aset');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Ekspor Laporan Permasalahan Aset ke Excel
 */
export function exportIssuesToExcel(issues: AssetIssue[] = [], assets: Asset[] = [], filenamePrefix = 'Laporan_Permasalahan_Aset') {
  const rows = mapIssueRows(issues, assets);
  const worksheetRows = rows.length > 0 ? rows : [{ Status: 'Tidak ada data permasalahan aset' }];
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
  if (rows.length > 0) autoFitColumns(worksheet, rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Permasalahan Aset');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Ekspor Laporan Usulan Penghapusan BMN ke Excel
 */
export function exportDisposalsToExcel(proposals: BmnDisposalProposal[] = [], filenamePrefix = 'Laporan_Penghapusan_BMN') {
  const rows = mapDisposalRows(proposals);
  const worksheetRows = rows.length > 0 ? rows : [{ Status: 'Tidak ada data usulan penghapusan BMN' }];
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
  if (rows.length > 0) autoFitColumns(worksheet, rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Penghapusan BMN');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Ekspor Master Gabungan Multi-Sheet (Sheet 1: Pemanfaatan, Sheet 2: Permasalahan, Sheet 3: Penghapusan BMN)
 */
export function exportMasterReportToExcel(
  utilizations: Utilization[] = [],
  issues: AssetIssue[] = [],
  proposals: BmnDisposalProposal[] = [],
  assets: Asset[] = [],
  filenamePrefix = 'Laporan_Master_Manajemen_Aset_BMN'
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Pemanfaatan Aset
  const utilRows = mapUtilizationRows(utilizations, assets);
  const utilWs = XLSX.utils.json_to_sheet(utilRows.length > 0 ? utilRows : [{ Status: 'Tidak ada data pemanfaatan' }]);
  if (utilRows.length > 0) autoFitColumns(utilWs, utilRows);
  XLSX.utils.book_append_sheet(workbook, utilWs, 'Pemanfaatan Aset');

  // Sheet 2: Permasalahan Aset
  const issueRows = mapIssueRows(issues, assets);
  const issueWs = XLSX.utils.json_to_sheet(issueRows.length > 0 ? issueRows : [{ Status: 'Tidak ada data permasalahan' }]);
  if (issueRows.length > 0) autoFitColumns(issueWs, issueRows);
  XLSX.utils.book_append_sheet(workbook, issueWs, 'Permasalahan Aset');

  // Sheet 3: Penghapusan BMN
  const dispRows = mapDisposalRows(proposals);
  const dispWs = XLSX.utils.json_to_sheet(dispRows.length > 0 ? dispRows : [{ Status: 'Tidak ada data pengusulan penghapusan BMN' }]);
  if (dispRows.length > 0) autoFitColumns(dispWs, dispRows);
  XLSX.utils.book_append_sheet(workbook, dispWs, 'Penghapusan BMN');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}
