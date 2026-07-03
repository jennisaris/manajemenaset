import assert from 'node:assert/strict';
import test from 'node:test';
import { canViewAllUniversities } from '../src/lib/auth';

test('Admin Aset dapat melihat data semua kampus', () => {
  assert.equal(canViewAllUniversities('Admin Aset'), true);
});

test('Operator Kampus tetap dibatasi per kampus', () => {
  assert.equal(canViewAllUniversities('Operator Kampus'), false);
});
