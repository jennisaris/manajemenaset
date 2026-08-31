import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUserRole } from '../src/lib/role-utils';

test('normalizeUserRole maps legacy Operator to Operator Kampus', () => {
  assert.equal(normalizeUserRole('Operator'), 'Operator Kampus');
});

test('normalizeUserRole maps Supabase legacy role names', () => {
  assert.equal(normalizeUserRole('Super Admin'), 'Superadmin');
  assert.equal(normalizeUserRole('Pimpinan/Viewer'), 'Pimpinan Dashboard');
  assert.equal(normalizeUserRole('Verifikator'), 'Superadmin');
});

test('normalizeUserRole does not elevate unknown roles', () => {
  assert.equal(normalizeUserRole('Unknown Role'), null);
});

test('normalizeUserRole accepts canonical roles unchanged', () => {
  assert.equal(normalizeUserRole('Superadmin'), 'Superadmin');
  assert.equal(normalizeUserRole('Operator Kampus'), 'Operator Kampus');
  assert.equal(normalizeUserRole('Pimpinan Dashboard'), 'Pimpinan Dashboard');
});
