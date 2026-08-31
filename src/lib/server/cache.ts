type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export class TtlCache<K = string, V = unknown> {
  private store = new Map<K, CacheEntry<V>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { data: value, expiresAt });
  }

  async getOrFetch(key: K, fetcher: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const fresh = await fetcher();
    this.set(key, fresh, ttlMs);
    return fresh;
  }

  invalidate(key: K): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

export function createTtlCache<K = string, V = unknown>(defaultTtlMs = 60000): TtlCache<K, V> {
  return new TtlCache<K, V>(defaultTtlMs);
}
