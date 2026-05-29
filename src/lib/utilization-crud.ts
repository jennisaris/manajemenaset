import { apiJson } from './api-client';
import type { Utilization } from './types';

type PersistUtilizationResult = {
  utilization: Utilization;
  mode: 'postgres' | 'demo';
};

export async function persistUtilization(utilization: Utilization, options: { isNew?: boolean } = {}): Promise<PersistUtilizationResult> {
  return apiJson<PersistUtilizationResult>('/api/utilizations', { method: 'POST', body: JSON.stringify({ utilization, isNew: options.isNew }) });
}

export async function deleteUtilization(utilizationId: number): Promise<{ mode: 'postgres' | 'demo' }> {
  return apiJson<{ mode: 'postgres' | 'demo' }>(`/api/utilizations?id=${utilizationId}`, { method: 'DELETE' });
}
