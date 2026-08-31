import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPhotoBatchInsert, buildDocumentBatchInsert } from '../src/lib/server/repositories/asset-repository';

test('buildPhotoBatchInsert menghasilkan parameterized multi-row INSERT tunggal', () => {
  const assetId = 42;
  const photoPaths = ['uploads/a.png', 'uploads/b.png'];
  const photoUrls = ['/uploads/a.png', '/uploads/b.png'];
  const photoNames = ['Foto A', 'Foto B'];

  const { query, params } = buildPhotoBatchInsert(assetId, photoPaths, photoUrls, photoNames);

  assert.ok(query.includes('insert into asset_photos'), 'Harus berupa query insert into asset_photos');
  assert.ok(query.includes('($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)'), 'Harus membentuk batch 2-row values');
  assert.equal(params.length, 10, 'Total parameter harus 10 untuk 2 foto');
  assert.equal(params[0], 42);
  assert.equal(params[1], 'uploads/a.png');
  assert.equal(params[4], true, 'Foto pertama is_primary = true');
  assert.equal(params[9], false, 'Foto kedua is_primary = false');
});

test('buildPhotoBatchInsert mengembalikan query kosong jika photoPaths kosong', () => {
  const { query, params } = buildPhotoBatchInsert(42, [], [], []);
  assert.equal(query, '');
  assert.equal(params.length, 0);
});

test('buildDocumentBatchInsert menghasilkan parameterized multi-row INSERT tunggal', () => {
  const assetId = 99;
  const docPaths = ['doc1.pdf', 'doc2.pdf'];
  const docNames = ['Dokumen 1', 'Dokumen 2'];

  const { query, params } = buildDocumentBatchInsert(assetId, docPaths, docNames);

  assert.ok(query.includes('insert into asset_documents'), 'Harus berupa query insert into asset_documents');
  assert.ok(query.includes('($1, $2, $3), ($4, $5, $6)'), 'Harus membentuk batch 2-row values');
  assert.equal(params.length, 6);
  assert.equal(params[0], 99);
  assert.equal(params[1], 'Dokumen 1');
  assert.equal(params[2], 'doc1.pdf');
});
