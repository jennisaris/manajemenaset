import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIssueProgress, parseDocumentsJson } from '../src/lib/server/repositories/issue-repository';

test('parseDocumentsJson parses legacy single document properly', () => {
  const result = parseDocumentsJson(
    'Berita_Acara.pdf',
    'issues/1/progress/ba.pdf',
    '/uploads/issues/1/progress/ba.pdf'
  );

  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].name, 'Berita_Acara.pdf');
  assert.equal(result.documents[0].path, 'issues/1/progress/ba.pdf');
  assert.equal(result.documents[0].url, '/uploads/issues/1/progress/ba.pdf');
  assert.equal(result.primaryName, 'Berita_Acara.pdf');
  assert.equal(result.primaryPath, 'issues/1/progress/ba.pdf');
});

test('parseDocumentsJson parses multiple documents stored as JSON arrays', () => {
  const names = JSON.stringify(['Surat_Tugas.pdf', 'Foto_Temuan.jpg', 'Kajian_Hukum.docx']);
  const paths = JSON.stringify(['issues/1/p1.pdf', 'issues/1/p2.jpg', 'issues/1/p3.docx']);
  const urls = JSON.stringify(['/uploads/issues/1/p1.pdf', '/uploads/issues/1/p2.jpg', '/uploads/issues/1/p3.docx']);

  const result = parseDocumentsJson(names, paths, urls);

  assert.equal(result.documents.length, 3);
  assert.equal(result.documents[0].name, 'Surat_Tugas.pdf');
  assert.equal(result.documents[1].name, 'Foto_Temuan.jpg');
  assert.equal(result.documents[2].name, 'Kajian_Hukum.docx');
  assert.equal(result.primaryName, 'Surat_Tugas.pdf');
  assert.equal(result.primaryPath, 'issues/1/p1.pdf');
});

test('normalizeIssueProgress returns documents array and supports multiple responsible persons', () => {
  const row = {
    id: 5,
    issue_id: 12,
    progress_date: '2026-09-22',
    progress_description: 'Rapat koordinasi lintas unit',
    responsible_person: 'Budi Santoso, Siti Rahma, Tim Hukum BMN',
    result_note: 'Sudah disepakati berita acara',
    status: 'dalam_proses',
    document_name: JSON.stringify(['BA_Rapat.pdf', 'Daftar_Hadir.pdf']),
    document_path: JSON.stringify(['issues/12/ba.pdf', 'issues/12/dh.pdf']),
    document_url: JSON.stringify(['/uploads/issues/12/ba.pdf', '/uploads/issues/12/dh.pdf']),
  };

  const normalized = normalizeIssueProgress(row);

  assert.equal(normalized.id, 5);
  assert.equal(normalized.issue_id, 12);
  assert.equal(normalized.responsible_person, 'Budi Santoso, Siti Rahma, Tim Hukum BMN');
  assert.equal(normalized.documents?.length, 2);
  assert.equal(normalized.documents?.[0].name, 'BA_Rapat.pdf');
  assert.equal(normalized.documents?.[1].name, 'Daftar_Hadir.pdf');
  assert.equal(normalized.document_name, 'BA_Rapat.pdf');
});
