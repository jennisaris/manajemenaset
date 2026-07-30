import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { createDisposalInDb, deleteDisposalFromDb, getDisposalsFromDb, parseLampiranRecap } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import type { BmnDisposalProposal } from '@/lib/types';

function safePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/-+/g, '-').replace(/^[-/]+|[-/]+$/g, '') || 'file';
}

async function saveUploadedFile(file: File, folder: string, prefix: string) {
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
  const filename = `${Date.now()}-${safePart(prefix)}-${safePart(file.name.replace(/\.[^.]+$/, ''))}${extension}`;
  const relativePath = safePart(path.posix.join('disposals', folder, filename));
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
  const fullPath = path.join(uploadRoot, relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return {
    name: file.name,
    path: relativePath,
    url: `/uploads/${relativePath}`,
    buffer,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterKodeSatker = searchParams.get('kode_satker');

    let proposals: BmnDisposalProposal[] = [];

    if (user.role === 'Operator Kampus') {
      proposals = await getDisposalsFromDb(user.kode_satker, user.university_name);
    } else if (filterKodeSatker) {
      proposals = await getDisposalsFromDb(filterKodeSatker);
    } else {
      proposals = await getDisposalsFromDb();
    }

    return NextResponse.json({ proposals });
  } catch (err) {
    console.error('GET /api/disposals error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data usulan penghapusan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    const no_surat_permohonan = String(formData.get('no_surat_permohonan') ?? '').trim();
    let kode_satker = String(formData.get('kode_satker') ?? '').trim();
    let nama_satker = String(formData.get('nama_satker') ?? '').trim();

    if (user.role === 'Operator Kampus') {
      if (user.kode_satker) kode_satker = user.kode_satker;
      if (user.university_name) nama_satker = user.university_name;
    }

    if (!no_surat_permohonan) {
      return NextResponse.json({ error: 'Nomor Surat Permohonan wajib diisi.' }, { status: 400 });
    }

    if (!kode_satker || !nama_satker) {
      return NextResponse.json({ error: 'Satuan Kerja / Perguruan Tinggi wajib dipilih.' }, { status: 400 });
    }

    const fileSuratPermohonan = formData.get('surat_permohonan') as File | null;
    const fileSptjm = formData.get('sptjm') as File | null;
    const fileLampiran = formData.get('lampiran') as File | null;
    const fileSkTim = formData.get('sk_tim') as File | null;
    const fileBaPenelitian = formData.get('ba_penelitian') as File | null;

    if (!fileSuratPermohonan || !fileSptjm || !fileLampiran || !fileSkTim || !fileBaPenelitian) {
      return NextResponse.json(
        { error: 'Semua berkas dokumen (Surat Permohonan PDF, SPTJM PDF, Lampiran CSV/XLSX, SK Tim PDF, BA Penelitian PDF) wajib diunggah.' },
        { status: 400 }
      );
    }

    // Save files
    const resSurat = await saveUploadedFile(fileSuratPermohonan, 'surat', kode_satker);
    const resSptjm = await saveUploadedFile(fileSptjm, 'sptjm', kode_satker);
    const resLampiran = await saveUploadedFile(fileLampiran, 'lampiran', kode_satker);
    const resSkTim = await saveUploadedFile(fileSkTim, 'sk_tim', kode_satker);
    const resBaPenelitian = await saveUploadedFile(fileBaPenelitian, 'ba_penelitian', kode_satker);

    // Auto-parse Lampiran file for recapitulation if text/csv
    let jumlah_barang = parseInt(String(formData.get('jumlah_barang') ?? '0'), 10);
    let jenis_barang = String(formData.get('jenis_barang') ?? '').trim();
    let nilai_perolehan = parseFloat(String(formData.get('nilai_perolehan') ?? '0'));

    if (fileLampiran.name.toLowerCase().endsWith('.csv') || fileLampiran.type.includes('csv') || fileLampiran.type.includes('text')) {
      const textContent = resLampiran.buffer.toString('utf8');
      const recap = parseLampiranRecap(textContent);
      if (!jumlah_barang || jumlah_barang === 0) jumlah_barang = recap.jumlahBarang;
      if (!jenis_barang) jenis_barang = recap.jenisBarang;
      if (!nilai_perolehan || nilai_perolehan === 0) nilai_perolehan = recap.nilaiPerolehan;
    }

    if (!jenis_barang) jenis_barang = 'BMN Peralatan & Bangunan';

    const newProposal = await createDisposalInDb({
      kode_satker,
      nama_satker,
      no_surat_permohonan,
      surat_permohonan_name: resSurat.name,
      surat_permohonan_path: resSurat.path,
      surat_permohonan_url: resSurat.url,
      sptjm_name: resSptjm.name,
      sptjm_path: resSptjm.path,
      sptjm_url: resSptjm.url,
      lampiran_name: resLampiran.name,
      lampiran_path: resLampiran.path,
      lampiran_url: resLampiran.url,
      sk_tim_name: resSkTim.name,
      sk_tim_path: resSkTim.path,
      sk_tim_url: resSkTim.url,
      ba_penelitian_name: resBaPenelitian.name,
      ba_penelitian_path: resBaPenelitian.path,
      ba_penelitian_url: resBaPenelitian.url,
      jumlah_barang: jumlah_barang || 1,
      jenis_barang,
      nilai_perolehan: nilai_perolehan || 0,
      status: 'menunggu_verifikasi',
      catatan: String(formData.get('catatan') ?? '').trim() || null,
    });

    return NextResponse.json({ proposal: newProposal });
  } catch (err) {
    console.error('POST /api/disposals error:', err);
    return NextResponse.json({ error: 'Gagal mengajukan usulan penghapusan BMN.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam) {
      return NextResponse.json({ error: 'ID usulan wajib diisi.' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const success = await deleteDisposalFromDb(id);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('DELETE /api/disposals error:', err);
    return NextResponse.json({ error: 'Gagal menghapus usulan penghapusan.' }, { status: 500 });
  }
}
