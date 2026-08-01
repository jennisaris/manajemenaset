import assert from 'node:assert/strict';
import test from 'node:test';
import { canViewAllUniversities } from '../src/lib/auth';

test('Superadmin dapat melihat data semua kampus', () => {
  assert.equal(canViewAllUniversities('Superadmin'), true);
});

test('Operator Kampus tetap dibatasi per kampus', () => {
  assert.equal(canViewAllUniversities('Operator Kampus'), false);
});
