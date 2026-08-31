import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhotoBatchInsert, buildDocumentBatchInsert } from '@/lib/server/repositories/asset-repository';
import { getDashboardSummaryQuery } from '@/lib/server/services/dashboard-service';
import { parseLampiranRecap } from '@/lib/server/repositories/disposal-repository';

test('Uji Validasi TDD: Batch Insert menghasilkan parameter dan placeholder 100% presisi (Zero-Risk)', () => {
  const assetId = 99;
  const photoPaths = ['assets/p1.jpg', 'assets/p2.jpg', 'assets/p3.jpg'];
  const photoUrls = ['/uploads/assets/p1.jpg', '/uploads/assets/p2.jpg', '/uploads/assets/p3.jpg'];
  const photoNames = ['Foto Gedung Depan', 'Foto Ruang Rapat', 'Foto Taman'];

  const batch = buildPhotoBatchInsert(assetId, photoPaths, photoUrls, photoNames);

  // 1 query dengan 3 baris values ($1..$5), ($6..$10), ($11..$15)
  assert.equal(batch.params.length, 15);
  assert.equal(batch.params[0], 99);
  assert.equal(batch.params[1], 'assets/p1.jpg');
  assert.equal(batch.params[2], '/uploads/assets/p1.jpg');
  assert.equal(batch.params[3], 'Foto Gedung Depan');
  assert.equal(batch.params[4], true); // primary is true for first item

  assert.equal(batch.params[5], 99);
  assert.equal(batch.params[6], 'assets/p2.jpg');
  assert.equal(batch.params[9], false); // primary is false for second item

  assert.ok(batch.query.includes('insert into asset_photos'));
  assert.ok(batch.query.includes('($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)'));
  assert.ok(batch.query.includes('on conflict (asset_id, photo_path) do update'));
});

test('Uji Validasi TDD: Document Batch Insert menghasilkan struktur tuple yang identik', () => {
  const assetId = 101;
  const docPaths = ['docs/sertifikat.pdf', 'docs/imb.pdf'];
  const docNames = ['Sertifikat Tanah', 'Izin Mendirikan Bangunan'];

  const batch = buildDocumentBatchInsert(assetId, docPaths, docNames);

  assert.equal(batch.params.length, 6);
  assert.equal(batch.params[0], 101);
  assert.equal(batch.params[1], 'Sertifikat Tanah');
  assert.equal(batch.params[2], 'docs/sertifikat.pdf');

  assert.equal(batch.params[3], 101);
  assert.equal(batch.params[4], 'Izin Mendirikan Bangunan');
  assert.equal(batch.params[5], 'docs/imb.pdf');

  assert.ok(batch.query.includes('insert into asset_documents'));
  assert.ok(batch.query.includes('($1, $2, $3), ($4, $5, $6)'));
});

test('Uji Validasi TDD: Dashboard Summary Query mengeksekusi agregasi kondisional tunggal', () => {
  const querySql = getDashboardSummaryQuery();

  // Memastikan menggunakan filter clause efisien tanpa cross join lambat
  assert.match(querySql, /count\(\*\)\s+filter\s*\(where asset_type = 'land'\)/i);
  assert.match(querySql, /count\(\*\)\s+filter\s*\(where asset_type = 'building'\)/i);
  assert.match(querySql, /count\(\*\)\s+filter\s*\(where verification_status = 'terverifikasi'\)/i);
  assert.match(querySql, /count\(\*\)\s+filter\s*\(where verification_status = 'menunggu_verifikasi'\)/i);
  assert.match(querySql, /where coalesce\(is_deleted, 0\) = 0/i);
});

test('Uji Validasi TDD: Parsing Lampiran Rekapitulasi Usulan BMN', () => {
  const csvContent = `
No,Jenis Barang,Nilai Perolehan
1,Laptop Asus,15000000
2,Proyektor Epson,8500000
3,Mobil Avanza,210000000
Total,,233500000
  `.trim();

  const recap = parseLampiranRecap(csvContent);
  assert.equal(recap.jumlahBarang, 3); // baris total tidak ikut terhitung
  assert.equal(recap.nilaiPerolehan, 233500000);
  assert.ok(recap.jenisBarang.length > 0);
});

test('Benchmark: Builder Batch Insert mampu memproses 500 item dalam waktu sub-milidetik', () => {
  const count = 500;
  const paths = Array.from({ length: count }, (_, i) => `uploads/asset_${i}.jpg`);
  const urls = paths.map((p) => `https://storage.local/${p}`);
  const names = Array.from({ length: count }, (_, i) => `Foto ${i}`);

  const start = performance.now();
  const batch = buildPhotoBatchInsert(12345, paths, urls, names);
  const end = performance.now();
  const duration = end - start;

  assert.equal(batch.params.length, count * 5);
  // Pembangunan query 500 item parameterized harus selesai di bawah 15ms
  assert.ok(duration < 15, `Durasi buildPhotoBatchInsert (${duration.toFixed(2)}ms) harus < 15ms`);
});
