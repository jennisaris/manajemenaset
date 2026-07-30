import { NextResponse } from 'next/server';
import {
  deleteBmnAssetFromDb,
  getBmnAssetsFromDb,
  upsertBmnAssetToDb,
} from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';
import type { BmnAssetItem, BmnCategoryType } from '@/lib/types';

const validCategories: BmnCategoryType[] = ['alat_angkutan', 'khusus_tik', 'non_tik'];

function resolveCategory(cat: string): BmnCategoryType | null {
  const normalized = cat.toLowerCase().replace(/-/g, '_');
  if (validCategories.includes(normalized as BmnCategoryType)) {
    return normalized as BmnCategoryType;
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const resolvedParams = await params;
    const category = resolveCategory(resolvedParams.category);
    if (!category) {
      return NextResponse.json({ error: 'Kategori BMN tidak valid.' }, { status: 400 });
    }

    const user = await getSessionUser();
    let data: BmnAssetItem[] = [];
    if (user?.role === 'Operator Kampus') {
      data = await getBmnAssetsFromDb(category, user.kode_satker, user.university_name);
    } else {
      data = await getBmnAssetsFromDb(category);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('API GET /api/bmn error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data BMN.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const resolvedParams = await params;
    const category = resolveCategory(resolvedParams.category);
    if (!category) {
      return NextResponse.json({ error: 'Kategori BMN tidak valid.' }, { status: 400 });
    }

    const body = (await request.json()) as Partial<BmnAssetItem>;
    if (!body.nama_barang) {
      return NextResponse.json({ error: 'Nama barang wajib diisi.' }, { status: 400 });
    }

    const user = await getSessionUser();
    if (user?.role === 'Operator Kampus') {
      if (user.kode_satker) body.kode_satker = user.kode_satker;
      if (user.university_name) body.nama_satker = user.university_name;
    }

    const saved = await upsertBmnAssetToDb(category, body);
    return NextResponse.json({ data: saved });
  } catch (err) {
    console.error('API POST /api/bmn error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan data BMN.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  return POST(request, { params });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const resolvedParams = await params;
    const category = resolveCategory(resolvedParams.category);
    if (!category) {
      return NextResponse.json({ error: 'Kategori BMN tidak valid.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam) {
      return NextResponse.json({ error: 'ID BMN wajib diberikan.' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const success = await deleteBmnAssetFromDb(category, id);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('API DELETE /api/bmn error:', err);
    return NextResponse.json({ error: 'Gagal menghapus data BMN.' }, { status: 500 });
  }
}
