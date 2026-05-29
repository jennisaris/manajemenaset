import { apiJson } from './api-client';
import type { Asset } from './types';

type PersistAssetResult = {
  asset: Asset;
  mode: 'postgres' | 'demo';
};

export async function persistAsset(asset: Asset): Promise<PersistAssetResult> {
  return apiJson<PersistAssetResult>('/api/assets', { method: 'POST', body: JSON.stringify(asset) });
}

export async function deleteAsset(assetId: number): Promise<{ mode: 'postgres' | 'demo' }> {
  return apiJson<{ mode: 'postgres' | 'demo' }>(`/api/assets?id=${assetId}`, { method: 'DELETE' });
}
