import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { query } from '@/lib/server/db';
import type { Satker } from '@/lib/types';

import { createTtlCache } from '@/lib/server/cache';

let cachedSatkerJson: Satker[] | null = null;
const satkerCache = createTtlCache<string, Satker[]>(300000); // 5 min TTL

function getSatkerFromJson(): Satker[] {
  if (cachedSatkerJson) return cachedSatkerJson;
  const jsonPath = resolve(process.cwd(), 'db', 'export', 'satker.json');
  if (!existsSync(jsonPath)) return [];
  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as Satker[];
    cachedSatkerJson = data;
    return data;
  } catch (err) {
    console.error('Gagal membaca satker.json:', err);
    return [];
  }
}

export async function getSatkerListFromDb(): Promise<Satker[]> {
  return satkerCache.getOrFetch('satker_list_all', async () => {
    try {
      const res = await query<Satker>(
        `select id, kode_satker, nama_satker from satker order by kode_satker asc`
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      console.warn('Gagal mengambil data Satker dari PostgreSQL, menggunakan fallback JSON:', err);
    }
    return getSatkerFromJson();
  });
}

