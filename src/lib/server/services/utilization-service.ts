import 'server-only';
import { getUtilizationsFromDb, upsertUtilizationToDb, deleteUtilizationFromDb } from '@/lib/server/repositories/utilization-repository';
import type { Utilization } from '@/lib/types';

export async function fetchAllUtilizations(): Promise<Utilization[]> {
  return getUtilizationsFromDb();
}

export async function saveUtilization(utilization: Utilization, isNew = false): Promise<Utilization> {
  return upsertUtilizationToDb(utilization, isNew);
}

export async function removeUtilization(utilizationId: number): Promise<void> {
  if (!utilizationId || utilizationId <= 0) {
    throw new Error('ID Pemanfaatan tidak valid.');
  }
  return deleteUtilizationFromDb(utilizationId);
}
