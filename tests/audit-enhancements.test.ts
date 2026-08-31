import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, resetRateLimit, clearRateLimitStore } from '../src/lib/server/rate-limiter';
import {
  validateUploadFile,
  validateLoginPayload,
  validateAssetPayload,
  MAX_IMAGE_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../src/lib/server/validation';
import { buildAssetFilterClauses } from '../src/lib/server/repositories/asset-repository';

test('Rate Limiter: Membatasi request saat melebihi kuota dan mengizinkan reset', async () => {
  await clearRateLimitStore();
  const testKey = 'test:rate:limit:user1';

  // 3 requests allowed
  const r1 = await checkRateLimit(testKey, 3, 1000);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = await checkRateLimit(testKey, 3, 1000);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = await checkRateLimit(testKey, 3, 1000);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // 4th request must be blocked
  const r4 = await checkRateLimit(testKey, 3, 1000);
  assert.equal(r4.allowed, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.resetSeconds >= 1);

  // Reset allows new requests
  await resetRateLimit(testKey);
  const r5 = await checkRateLimit(testKey, 3, 1000);
  assert.equal(r5.allowed, true);
  assert.equal(r5.remaining, 2);
});

test('Validasi Upload: Memverifikasi batas ukuran file gambar dan dokumen', () => {
  // Mock File helper
  function createMockFile(name: string, size: number): File {
    return {
      name,
      size,
      type: 'application/octet-stream',
    } as unknown as File;
  }

  // Valid image
  const validImg = createMockFile('photo.png', 2 * 1024 * 1024);
  const v1 = validateUploadFile(validImg);
  assert.equal(v1.success, true);

  // Oversized image (> 8MB)
  const hugeImg = createMockFile('huge.jpg', MAX_IMAGE_SIZE_BYTES + 1024);
  const v2 = validateUploadFile(hugeImg);
  assert.equal(v2.success, false);
  if (!v2.success) {
    assert.ok(v2.error.includes('melebihi batas'));
  }

  // Valid document
  const validDoc = createMockFile('document.pdf', 5 * 1024 * 1024);
  const v3 = validateUploadFile(validDoc);
  assert.equal(v3.success, true);

  // Oversized document (> 15MB)
  const hugeDoc = createMockFile('archive.pdf', MAX_DOCUMENT_SIZE_BYTES + 1024);
  const v4 = validateUploadFile(hugeDoc);
  assert.equal(v4.success, false);

  // Unsupported extension
  const exeFile = createMockFile('virus.exe', 1024);
  const v5 = validateUploadFile(exeFile);
  assert.equal(v5.success, false);
  if (!v5.success) {
    assert.ok(v5.error.includes('tidak diizinkan'));
  }
});

test('Validasi Login Payload: Memeriksa kelengkapan dan format email', () => {
  // Valid login
  const valid = validateLoginPayload({ email: 'admin@kampus.ac.id', password: 'password123' });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, 'admin@kampus.ac.id');
  }

  // Invalid email
  const invalidEmail = validateLoginPayload({ email: 'bukan-email', password: 'password123' });
  assert.equal(invalidEmail.success, false);

  // Missing password
  const missingPass = validateLoginPayload({ email: 'user@test.com', password: '' });
  assert.equal(missingPass.success, false);
});

test('Validasi Asset Payload: Memeriksa kode, nama, tipe aset, dan batas koordinat', () => {
  // Valid asset
  const validAsset = validateAssetPayload({
    asset_code: 'AST-001',
    asset_name: 'Gedung Rektorat',
    asset_type: 'building',
    latitude: -6.2088,
    longitude: 106.8456,
    verification_status: 'terverifikasi',
  });
  assert.equal(validAsset.success, true);

  // Missing asset code
  const noCode = validateAssetPayload({
    asset_code: '',
    asset_name: 'Gedung',
    asset_type: 'building',
  });
  assert.equal(noCode.success, false);

  // Invalid asset type
  const badType = validateAssetPayload({
    asset_code: 'AST-002',
    asset_name: 'Mobil',
    asset_type: 'vehicle' as any,
  });
  assert.equal(badType.success, false);

  // Invalid latitude (> 90)
  const badLat = validateAssetPayload({
    asset_code: 'AST-003',
    asset_name: 'Tanah',
    asset_type: 'land',
    latitude: 105.5,
  });
  assert.equal(badLat.success, false);
});

test('Asset Filter & Pagination Builder: Menghasilkan klausa WHERE parameterized yang presisi', () => {
  // Filter search + type + status
  const filter = buildAssetFilterClauses({
    search: 'Rektorat',
    asset_type: 'building',
    verification_status: 'terverifikasi',
    kode_satker: 'SK-101',
  });

  assert.ok(filter.whereClause.includes('a.asset_name ilike $1'));
  assert.ok(filter.whereClause.includes('a.asset_type = $2'));
  assert.ok(filter.whereClause.includes('a.verification_status = $3'));
  assert.ok(filter.whereClause.includes('a.kode_satker = $4'));
  assert.equal(filter.params.length, 4);
  assert.equal(filter.params[0], '%Rektorat%');
  assert.equal(filter.params[1], 'building');
  assert.equal(filter.params[2], 'terverifikasi');
  assert.equal(filter.params[3], 'SK-101');
});
