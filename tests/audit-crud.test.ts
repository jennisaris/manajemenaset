import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUserRole } from '../src/lib/role-utils';
import { normalizeIssue, normalizeIssueProgress } from '../src/lib/server/repositories/issue-repository';

test('Audit CRUD - User Management: Validasi normalisasi role dan proteksi role asing', () => {
  assert.equal(normalizeUserRole('Superadmin'), 'Superadmin');
  assert.equal(normalizeUserRole('Super Admin'), 'Superadmin');
  assert.equal(normalizeUserRole('Operator'), 'Operator Kampus');
  assert.equal(normalizeUserRole('Operator Kampus'), 'Operator Kampus');
  assert.equal(normalizeUserRole('Pimpinan/Viewer'), 'Pimpinan Dashboard');
  assert.equal(normalizeUserRole('Unknown Role'), null);
});

test('Audit CRUD - Issue Progress: Normalisasi riwayat progres dan penanganan multiple PIC / dokumen', () => {
  const mockProgressRow = {
    id: 101,
    issue_id: 42,
    progress_date: '2026-10-15',
    progress_description: 'Negosiasi batas patok tanah',
    responsible_person: 'Dr. Ahmad, Ir. Budi',
    result_note: 'Pertemuan dihadiri kedua belah pihak',
    status: 'dalam_proses',
    document_name: JSON.stringify(['dok1.pdf', 'dok2.pdf']),
    document_path: JSON.stringify(['issues/42/dok1.pdf', 'issues/42/dok2.pdf']),
    document_url: JSON.stringify(['/uploads/issues/42/dok1.pdf', '/uploads/issues/42/dok2.pdf']),
    created_at: new Date('2026-10-15T10:00:00Z'),
  };

  const normalized = normalizeIssueProgress(mockProgressRow);
  assert.equal(normalized.id, 101);
  assert.equal(normalized.issue_id, 42);
  assert.equal(normalized.progress_description, 'Negosiasi batas patok tanah');
  assert.ok(normalized.documents);
  assert.equal(normalized.documents.length, 2);
  assert.equal(normalized.documents[0]?.name, 'dok1.pdf');
  assert.equal(normalized.documents[1]?.name, 'dok2.pdf');
});

test('Audit CRUD - Sengketa Aset: Normalisasi deskripsi dan judul permasalahan', () => {
  const mockIssueRow = {
    id: 55,
    asset_id: 12,
    issue_title: 'Sengketa Batas Lahan Selatan',
    issue_type: 'sengketa_lahan',
    priority: 'tinggi',
    status: 'dalam_proses',
    found_date: '2026-09-01T00:00:00.000Z',
    description: 'Klaim sepihak masyarakat atas area lapangan olah raga.',
    estimated_loss: 50000000,
    created_at: new Date('2026-09-01T08:00:00Z'),
    updated_at: new Date('2026-09-05T08:00:00Z'),
  };

  const normalized = normalizeIssue(mockIssueRow);
  assert.equal(normalized.id, 55);
  assert.equal(normalized.asset_id, 12);
  assert.equal(normalized.issue_title, 'Sengketa Batas Lahan Selatan');
  assert.equal(normalized.issue_type, 'sengketa_lahan');
  assert.equal(normalized.priority, 'tinggi');
  assert.equal(normalized.description, 'Klaim sepihak masyarakat atas area lapangan olah raga.');
  assert.equal(normalized.found_date, '2026-09-01');
});
