import { NextResponse } from 'next/server';
import { deleteAssetFromDb, upsertAssetToDb } from '@/lib/server/local-repository';
import { getAssetsFromDb, getAssetCountFromDb, type AssetListOptions } from '@/lib/server/repositories/asset-repository';
import { getSessionUser } from '@/lib/server/session';
import { canManageAssets } from '@/lib/auth';
import { validateAssetPayload } from '@/lib/server/validation';
import type { Asset } from '@/lib/types';

async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user };
}

async function requireManager() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageAssets(user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? 50);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 50, 1000));
  const rawOffset = Number(url.searchParams.get('offset') ?? 0);
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  const search = url.searchParams.get('search') ?? undefined;
  const asset_type = url.searchParams.get('asset_type') ?? undefined;
  const verification_status = url.searchParams.get('verification_status') ?? undefined;

  const options: AssetListOptions = {
    limit,
    offset,
    search: search ? search.trim() : undefined,
    asset_type: asset_type ? asset_type.trim() : undefined,
    verification_status: verification_status ? verification_status.trim() : undefined,
  };

  if (auth.user.role === 'Operator Kampus') {
    if (!auth.user.kode_satker) {
      // Operator Kampus without kode_satker should not see any assets
      return NextResponse.json({ data: [], meta: { total: 0, limit, offset, count: 0, hasMore: false } });
    }
    options.kode_satker = auth.user.kode_satker;
  }

  const [data, total] = await Promise.all([
    getAssetsFromDb(options),
    getAssetCountFromDb(options),
  ]);

  return NextResponse.json({
    data,
    meta: {
      total,
      limit,
      offset,
      count: data.length,
      hasMore: offset + data.length < total,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const validation = validateAssetPayload(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error, field: validation.field }, { status: 400 });
  }

  const asset: Asset = validation.data;
  if (auth.user.role === 'Operator Kampus') {
    if (auth.user.kode_satker) asset.kode_satker = auth.user.kode_satker;
    if (auth.user.university_name) asset.campus_name = auth.user.university_name;
  }

  // Auto-approve assets directly upon saving
  asset.verification_status = 'terverifikasi';
  return NextResponse.json({ asset: await upsertAssetToDb(asset), mode: 'postgres' });
}

export async function DELETE(request: Request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Asset id wajib diisi.' }, { status: 400 });
  await deleteAssetFromDb(id);
  return NextResponse.json({ mode: 'postgres' });
}
