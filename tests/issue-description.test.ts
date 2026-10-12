import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIssue } from '../src/lib/server/repositories/issue-repository';

test('normalizeIssue maps description field properly', () => {
  const row = {
    id: '10',
    asset_id: '5',
    issue_title: 'Kerusakan Plafon',
    issue_type: 'kerusakan_fisik',
    priority: 'tinggi',
    status: 'dicatat',
    found_date: '2026-09-20T00:00:00.000Z',
    description: 'Plafon ruang kelas 101 jebol akibat rembesan air hujan.',
  };

  const normalized = normalizeIssue(row);
  assert.equal(normalized.id, 10);
  assert.equal(normalized.asset_id, 5);
  assert.equal(normalized.issue_title, 'Kerusakan Plafon');
  assert.equal(normalized.description, 'Plafon ruang kelas 101 jebol akibat rembesan air hujan.');
  assert.equal(normalized.found_date, '2026-09-20');
});
