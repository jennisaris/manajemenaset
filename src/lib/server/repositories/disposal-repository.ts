import 'server-only';
import { query } from '@/lib/server/db';
import type { BmnDisposalProposal } from '@/lib/types';

export async function ensureBmnDisposalTable() {
  await query(`
    create table if not exists bmn_disposals (
      id bigserial primary key,
      kode_satker text not null,
      nama_satker text not null,
      no_surat_permohonan text not null,
      tgl_surat_permohonan date,
      surat_permohonan_name text,
      surat_permohonan_path text,
      surat_permohonan_url text,
      sptjm_name text,
      sptjm_path text,
      sptjm_url text,
      lampiran_name text,
      lampiran_path text,
      lampiran_url text,
      sk_tim_name text,
      sk_tim_path text,
      sk_tim_url text,
      ba_penelitian_name text,
      ba_penelitian_path text,
      ba_penelitian_url text,
      jumlah_barang integer default 0,
      jenis_barang text,
      nilai_perolehan numeric default 0,
      status text not null default 'menunggu_verifikasi',
      catatan text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    alter table bmn_disposals add column if not exists tgl_surat_permohonan date;
  `);
}

export function normalizeDisposal(row: Record<string, unknown>): BmnDisposalProposal {
  return {
    id: Number(row.id),
    kode_satker: String(row.kode_satker ?? ''),
    nama_satker: String(row.nama_satker ?? ''),
    no_surat_permohonan: String(row.no_surat_permohonan ?? ''),
    tgl_surat_permohonan: row.tgl_surat_permohonan ? String(row.tgl_surat_permohonan) : null,
    surat_permohonan_name: (row.surat_permohonan_name as string) ?? null,
    surat_permohonan_path: (row.surat_permohonan_path as string) ?? null,
    surat_permohonan_url: (row.surat_permohonan_url as string) ?? (row.surat_permohonan_path ? `/uploads/${row.surat_permohonan_path}` : null),
    sptjm_name: (row.sptjm_name as string) ?? null,
    sptjm_path: (row.sptjm_path as string) ?? null,
    sptjm_url: (row.sptjm_url as string) ?? (row.sptjm_path ? `/uploads/${row.sptjm_path}` : null),
    lampiran_name: (row.lampiran_name as string) ?? null,
    lampiran_path: (row.lampiran_path as string) ?? null,
    lampiran_url: (row.lampiran_url as string) ?? (row.lampiran_path ? `/uploads/${row.lampiran_path}` : null),
    sk_tim_name: (row.sk_tim_name as string) ?? null,
    sk_tim_path: (row.sk_tim_path as string) ?? null,
    sk_tim_url: (row.sk_tim_url as string) ?? (row.sk_tim_path ? `/uploads/${row.sk_tim_path}` : null),
    ba_penelitian_name: (row.ba_penelitian_name as string) ?? null,
    ba_penelitian_path: (row.ba_penelitian_path as string) ?? null,
    ba_penelitian_url: (row.ba_penelitian_url as string) ?? (row.ba_penelitian_path ? `/uploads/${row.ba_penelitian_path}` : null),
    jumlah_barang: Number(row.jumlah_barang ?? 0),
    jenis_barang: (row.jenis_barang as string) ?? null,
    nilai_perolehan: Number(row.nilai_perolehan ?? 0),
    status: (row.status as BmnDisposalProposal['status']) ?? 'menunggu_verifikasi',
    catatan: (row.catatan as string) ?? null,
    created_at: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    updated_at: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
  };
}

export async function getDisposalsFromDb(
  kodeSatker?: string | null,
  universityName?: string | null
): Promise<BmnDisposalProposal[]> {
  await ensureBmnDisposalTable();
  try {
    if (kodeSatker) {
      const res = await query<Record<string, unknown>>(
        `select * from bmn_disposals
         where kode_satker = $1 or ($2::text is not null and lower(nama_satker) = lower($2::text))
         order by id desc`,
        [kodeSatker, universityName || null]
      );
      return res.rows.map(normalizeDisposal);
    }

    const res = await query<Record<string, unknown>>(
      `select * from bmn_disposals order by id desc`
    );
    return res.rows.map(normalizeDisposal);
  } catch (err) {
    console.error('Gagal mengambil data bmn_disposals:', err);
    return [];
  }
}

export async function createDisposalInDb(
  item: Omit<BmnDisposalProposal, 'id'>
): Promise<BmnDisposalProposal> {
  await ensureBmnDisposalTable();
  const res = await query<Record<string, unknown>>(
    `insert into bmn_disposals (
       kode_satker, nama_satker, no_surat_permohonan, tgl_surat_permohonan,
       surat_permohonan_name, surat_permohonan_path, surat_permohonan_url,
       sptjm_name, sptjm_path, sptjm_url,
       lampiran_name, lampiran_path, lampiran_url,
       sk_tim_name, sk_tim_path, sk_tim_url,
       ba_penelitian_name, ba_penelitian_path, ba_penelitian_url,
       jumlah_barang, jenis_barang, nilai_perolehan, status, catatan
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
     returning *`,
    [
      item.kode_satker,
      item.nama_satker,
      item.no_surat_permohonan,
      item.tgl_surat_permohonan ?? null,
      item.surat_permohonan_name ?? null,
      item.surat_permohonan_path ?? null,
      item.surat_permohonan_url ?? null,
      item.sptjm_name ?? null,
      item.sptjm_path ?? null,
      item.sptjm_url ?? null,
      item.lampiran_name ?? null,
      item.lampiran_path ?? null,
      item.lampiran_url ?? null,
      item.sk_tim_name ?? null,
      item.sk_tim_path ?? null,
      item.sk_tim_url ?? null,
      item.ba_penelitian_name ?? null,
      item.ba_penelitian_path ?? null,
      item.ba_penelitian_url ?? null,
      item.jumlah_barang ?? 0,
      item.jenis_barang ?? null,
      item.nilai_perolehan ?? 0,
      item.status || 'menunggu_verifikasi',
      item.catatan ?? null,
    ]
  );

  return normalizeDisposal(res.rows[0]);
}

export async function deleteDisposalFromDb(id: number): Promise<boolean> {
  await ensureBmnDisposalTable();
  const res = await query('delete from bmn_disposals where id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function updateDisposalStatusInDb(
  id: number,
  status: string,
  catatan?: string | null
): Promise<BmnDisposalProposal | null> {
  await ensureBmnDisposalTable();
  const res = await query<Record<string, unknown>>(
    `update bmn_disposals
     set status = $2,
         catatan = coalesce($3, catatan),
         updated_at = now()
     where id = $1
     returning *`,
    [id, status, catatan ?? null]
  );
  if (res.rows.length === 0) return null;
  return normalizeDisposal(res.rows[0]);
}

/**
 * Parsing berkas lampiran CSV / Text untuk menghitung rekapitulasi usulan secara otomatis
 */
export function parseLampiranRecap(fileContentText: string) {
  const lines = fileContentText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { jumlahBarang: 0, jenisBarang: 'Peralatan & Mesin', nilaiPerolehan: 0 };
  }

  const categorySet = new Set<string>();
  let totalNilai = 0;
  let itemCount = 0;

  // Detect header line if present
  const headerLineIndex = lines.findIndex((l) => l.toLowerCase().includes('nilai perolehan') || l.toLowerCase().includes('jenis bmn') || l.toLowerCase().includes('jenis barang'));

  let nilaiColIdx = -1;
  let jenisColIdx = -1;

  if (headerLineIndex !== -1) {
    const headers = lines[headerLineIndex].split(/[,;\t]/).map((h) => h.replace(/^['"]|['"]$/g, '').trim().toLowerCase());
    nilaiColIdx = headers.findIndex((h) => h.includes('nilai perolehan') || h.includes('nilai_perolehan'));
    jenisColIdx = headers.findIndex((h) => (h.includes('jenis bmn') || h.includes('jenis barang') || h.includes('kategori')) && !h.includes('nama'));
  }

  const dataLines = headerLineIndex !== -1 ? lines.slice(headerLineIndex + 1) : lines;

  for (const line of dataLines) {
    const lowerLine = line.toLowerCase();
    const isTotalLine =
      lowerLine.includes('total') ||
      lowerLine.includes('jumlah') ||
      lowerLine.includes('subtotal') ||
      lowerLine.includes('rekapitulasi');

    if (isTotalLine) continue; // Exclude summary / total row from item count & summation

    itemCount++;
    const parts = line.split(/[,;\t]/).map((p) => p.replace(/^['"]|['"]$/g, '').trim());

    if (jenisColIdx !== -1 && parts[jenisColIdx]) {
      categorySet.add(parts[jenisColIdx]);
    } else {
      for (const part of parts) {
        if (part.length > 3 && isNaN(Number(part)) && !part.match(/^\d{10,}/) && !part.toLowerCase().includes('http')) {
          categorySet.add(part.toUpperCase());
          break;
        }
      }
    }

    if (nilaiColIdx !== -1 && parts[nilaiColIdx]) {
      const cleaned = parts[nilaiColIdx].replace(/[^0-9.]/g, '');
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) {
        totalNilai += val;
      }
    } else {
      for (const part of parts) {
        const cleaned = part.replace(/[^0-9.]/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 1000) {
          totalNilai += val;
          break;
        }
      }
    }
  }

  const categories = Array.from(categorySet).slice(0, 3).join(', ') || 'Peralatan & Mesin';

  return {
    jumlahBarang: itemCount > 0 ? itemCount : lines.length,
    jenisBarang: categories,
    nilaiPerolehan: totalNilai,
  };
}
