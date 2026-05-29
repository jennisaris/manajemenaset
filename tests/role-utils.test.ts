import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUserRole } from '../src/lib/role-utils';

test('normalizeUserRole maps legacy Operator to Operator Kampus', () => {
  assert.equal(normalizeUserRole('Operator'), 'Operator Kampus');
});

test('normalizeUserRole maps Supabase legacy role names', () => {
  assert.equal(normalizeUserRole('Super Admin'), 'Superadmin');
  assert.equal(normalizeUserRole('Pimpinan/Viewer'), 'Pimpinan Dashboard');
  assert.equal(normalizeUserRole('Verifikator'), 'Admin Aset');
});

test('normalizeUserRole does not elevate unknown roles to Admin Aset', () => {
  assert.equal(normalizeUserRole('Unknown Role'), null);
});

test('normalizeUserRole accepts canonical roles unchanged', () => {
  assert.equal(normalizeUserRole('Superadmin'), 'Superadmin');
  assert.equal(normalizeUserRole('Admin Aset'), 'Admin Aset');
  assert.equal(normalizeUserRole('Pimpinan Dashboard'), 'Pimpinan Dashboard');
});
