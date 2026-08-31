import assert from 'node:assert/strict';
import test from 'node:test';
import { createTtlCache } from '../src/lib/server/cache';

test('createTtlCache menyimpan dan mengembalikan data sebelum TTL kadaluarsa', async () => {
  const cache = createTtlCache<string, number>(1000); // 1 sec TTL
  let callCount = 0;

  const fetcher = async () => {
    callCount++;
    return 42;
  };

  const val1 = await cache.getOrFetch('key1', fetcher);
  assert.equal(val1, 42);
  assert.equal(callCount, 1);

  // Hit cache
  const val2 = await cache.getOrFetch('key1', fetcher);
  assert.equal(val2, 42);
  assert.equal(callCount, 1, 'Fetcher tidak boleh dipanggil ulang sebelum TTL habis');
});

test('createTtlCache dapat di-invalidate secara eksplisit', async () => {
  const cache = createTtlCache<string, string>(5000);
  let callCount = 0;

  const fetcher = async () => {
    callCount++;
    return `result_${callCount}`;
  };

  const val1 = await cache.getOrFetch('satker_list', fetcher);
  assert.equal(val1, 'result_1');

  cache.invalidate('satker_list');

  const val2 = await cache.getOrFetch('satker_list', fetcher);
  assert.equal(val2, 'result_2', 'Harus memanggil fetcher baru setelah invalidasi');
});

test('createTtlCache invalidateAll menghapus seluruh cache', async () => {
  const cache = createTtlCache<string, string>(5000);
  let count = 0;
  const fetcher = async () => `val_${++count}`;

  await cache.getOrFetch('k1', fetcher);
  await cache.getOrFetch('k2', fetcher);
  assert.equal(count, 2);

  cache.invalidateAll();

  await cache.getOrFetch('k1', fetcher);
  assert.equal(count, 3);
});
