import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { bulkUpsertAssetsToDb } from '@/lib/server/local-repository';
import { requireCsrf } from '@/lib/server/csrf-guard';
import { logger } from '@/lib/server/logger';
import type { Asset } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const csrfError = await requireCsrf();
    if (csrfError) return csrfError;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Data aset temporary kosong' }, { status: 400 });
    }

    const isOperator = user.role === 'Operator Kampus';
    if (isOperator && !user.kode_satker) {
      return NextResponse.json({ error: 'Akun Operator Kampus tidak memiliki kode satker yang valid.' }, { status: 403 });
    }

    const preparedAssets: Asset[] = items.map((item: Partial<Asset>) => ({
      ...item,
      id: item.id || `AST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      verification_status: isOperator ? 'menunggu_verifikasi' : (item.verification_status || 'terverifikasi'),
      campus_name: item.campus_name || user.university_name || 'Portofolio Kemdiktisaintek',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Asset));

    const insertedAssets = await bulkUpsertAssetsToDb(preparedAssets);

    return NextResponse.json({
      success: true,
      count: insertedAssets.length,
      assets: insertedAssets,
    });
  } catch (error: any) {
    logger.error('Bulk Upload Aset error', 'assets', { error: error.message || 'Unknown error' });
    return NextResponse.json({ error: error.message || 'Gagal memproses bulk upload aset' }, { status: 500 });
  }
}
