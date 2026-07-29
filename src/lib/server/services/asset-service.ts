import 'server-only';
import { getAssetsFromDb, upsertAssetToDb, deleteAssetFromDb } from '@/lib/server/repositories/asset-repository';
import type { Asset } from '@/lib/types';

export async function fetchAllAssets(): Promise<Asset[]> {
  return getAssetsFromDb();
}

export async function saveAsset(asset: Asset): Promise<Asset> {
  // Business logic rules: default verification_status if empty
  const payload: Asset = {
    ...asset,
    verification_status: asset.verification_status ?? 'draft',
  };
  return upsertAssetToDb(payload);
}

export async function removeAsset(assetId: number): Promise<void> {
  if (!assetId || assetId <= 0) {
    throw new Error('ID Aset tidak valid.');
  }
  return deleteAssetFromDb(assetId);
}
