import 'server-only';
import { query, transaction } from '@/lib/server/db';
import type { AssetIssue, IssueProgress } from '@/lib/types';

export function normalizeIssue(row: Record<string, unknown>): AssetIssue {
  return {
    id: Number(row.id),
    asset_id: Number(row.asset_id),
    issue_title: String(row.issue_title ?? ''),
    issue_type: String(row.issue_type ?? ''),
    priority: String(row.priority ?? 'sedang'),
    status: String(row.status ?? 'dicatat'),
    found_date: row.found_date ? String(row.found_date).slice(0, 10) : null,
  };
}

export function normalizeIssueProgress(row: Record<string, unknown>): IssueProgress {
  const documentPath = row.document_path as string | null;
  const documentUrl = row.document_url as string | null;
  return {
    id: Number(row.id),
    issue_id: Number(row.issue_id),
    progress_date: row.progress_date ? String(row.progress_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    progress_description: String(row.progress_description ?? ''),
    responsible_person: row.responsible_person as string | null,
    result_note: row.result_note as string | null,
    status: String(row.status ?? 'dicatat'),
    document_name: row.document_name as string | null,
    document_path: documentPath,
    document_url: documentUrl ?? (documentPath ? `/uploads/${documentPath}` : null),
  };
}

export async function ensureIssueProgressUploadColumns(client?: { query: (text: string, params?: unknown[]) => Promise<unknown> }) {
  const runner = client ?? { query };
  await runner.query('alter table issue_progress add column if not exists document_name text');
  await runner.query('alter table issue_progress add column if not exists document_path text');
  await runner.query('alter table issue_progress add column if not exists document_url text');
  await runner.query('alter table issue_progress add column if not exists updated_at timestamptz');
}

export async function getIssuesFromDb(): Promise<AssetIssue[]> {
  const { rows } = await query('select * from asset_issues order by id asc');
  return rows.map((row) => normalizeIssue(row));
}

export async function upsertIssueToDb(issue: AssetIssue, isNew = false): Promise<AssetIssue> {
  const foundDate = issue.found_date && String(issue.found_date).trim() ? String(issue.found_date).trim().slice(0, 10) : null;
  const { rows } = isNew
    ? await query('insert into asset_issues (asset_id, issue_title, issue_type, priority, status, found_date) values ($1,$2,$3,$4,$5,$6) returning *', [issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, foundDate])
    : await query('insert into asset_issues (id, asset_id, issue_title, issue_type, priority, status, found_date) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do update set asset_id=excluded.asset_id, issue_title=excluded.issue_title, issue_type=excluded.issue_type, priority=excluded.priority, status=excluded.status, found_date=excluded.found_date, updated_at=now() returning *', [issue.id, issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, foundDate]);
  return normalizeIssue(rows[0]);
}

export async function deleteIssueFromDb(issueId: number): Promise<void> {
  await query('delete from asset_issues where id = $1', [issueId]);
}

export async function getIssueProgressFromDb(): Promise<IssueProgress[]> {
  await ensureIssueProgressUploadColumns();
  const { rows } = await query('select * from issue_progress order by progress_date desc, id desc');
  return rows.map((row) => normalizeIssueProgress(row));
}

export async function upsertIssueProgressToDb(progress: IssueProgress): Promise<IssueProgress> {
  return transaction(async (client) => {
    await ensureIssueProgressUploadColumns(client);
    const { rows } = await client.query(
      'insert into issue_progress (issue_id, progress_date, progress_description, responsible_person, result_note, status, document_name, document_path, document_url) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
      [progress.issue_id, progress.progress_date, progress.progress_description, progress.responsible_person ?? null, progress.result_note ?? null, progress.status, progress.document_name ?? null, progress.document_path ?? null, progress.document_url ?? (progress.document_path ? `/uploads/${progress.document_path}` : null)]
    );
    return normalizeIssueProgress(rows[0]);
  });
}
