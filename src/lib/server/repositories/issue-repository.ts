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
    description: (row.description as string | null) ?? null,
  };
}

export function parseDocumentsJson(rawNames: unknown, rawPaths: unknown, rawUrls: unknown): {
  documents: { name: string; path?: string | null; url?: string | null }[];
  primaryName: string | null;
  primaryPath: string | null;
  primaryUrl: string | null;
} {
  let names: string[] = [];
  let paths: (string | null)[] = [];
  let urls: (string | null)[] = [];

  // Parse names
  if (typeof rawNames === 'string' && rawNames.trim()) {
    try {
      const parsed = JSON.parse(rawNames);
      if (Array.isArray(parsed)) names = parsed.map(String);
      else names = [rawNames];
    } catch {
      names = [rawNames];
    }
  } else if (Array.isArray(rawNames)) {
    names = rawNames.map(String);
  }

  // Parse paths
  if (typeof rawPaths === 'string' && rawPaths.trim()) {
    try {
      const parsed = JSON.parse(rawPaths);
      if (Array.isArray(parsed)) paths = parsed.map((p) => (p ? String(p) : null));
      else paths = [rawPaths];
    } catch {
      paths = [rawPaths];
    }
  } else if (Array.isArray(rawPaths)) {
    paths = rawPaths.map((p) => (p ? String(p) : null));
  }

  // Parse urls
  if (typeof rawUrls === 'string' && rawUrls.trim()) {
    try {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed)) urls = parsed.map((u) => (u ? String(u) : null));
      else urls = [rawUrls];
    } catch {
      urls = [rawUrls];
    }
  } else if (Array.isArray(rawUrls)) {
    urls = rawUrls.map((u) => (u ? String(u) : null));
  }

  const maxLen = Math.max(names.length, paths.length, urls.length);
  const documents: { name: string; path?: string | null; url?: string | null }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const path = paths[i] ?? null;
    const name = names[i] || (path ? path.split('/').pop() : `Dokumen ${i + 1}`) || 'Dokumen Pendukung';
    const url = urls[i] ?? (path ? (path.startsWith('/uploads/') || path.startsWith('http') ? path : `/uploads/${path}`) : null);
    documents.push({ name, path, url });
  }

  return {
    documents,
    primaryName: documents[0]?.name ?? null,
    primaryPath: documents[0]?.path ?? null,
    primaryUrl: documents[0]?.url ?? null,
  };
}

export function normalizeIssueProgress(row: Record<string, unknown>): IssueProgress {
  const { documents, primaryName, primaryPath, primaryUrl } = parseDocumentsJson(
    row.document_name,
    row.document_path,
    row.document_url
  );

  return {
    id: Number(row.id),
    issue_id: Number(row.issue_id),
    progress_date: row.progress_date ? String(row.progress_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    progress_description: String(row.progress_description ?? ''),
    responsible_person: row.responsible_person as string | null,
    result_note: row.result_note as string | null,
    status: String(row.status ?? 'dicatat'),
    document_name: primaryName,
    document_path: primaryPath,
    document_url: primaryUrl,
    documents,
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
  const description = issue.description !== undefined ? (issue.description || null) : null;
  const { rows } = isNew
    ? await query(
        'insert into asset_issues (asset_id, issue_title, issue_type, priority, status, found_date, description) values ($1,$2,$3,$4,$5,$6,$7) returning *',
        [issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, foundDate, description]
      )
    : await query(
        'insert into asset_issues (id, asset_id, issue_title, issue_type, priority, status, found_date, description) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do update set asset_id=excluded.asset_id, issue_title=excluded.issue_title, issue_type=excluded.issue_type, priority=excluded.priority, status=excluded.status, found_date=excluded.found_date, description=excluded.description, updated_at=now() returning *',
        [issue.id, issue.asset_id, issue.issue_title, issue.issue_type, issue.priority, issue.status, foundDate, description]
      );
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

    let docName = progress.document_name !== undefined ? progress.document_name : null;
    let docPath = progress.document_path !== undefined ? progress.document_path : null;
    let docUrl = progress.document_url !== undefined ? progress.document_url : (docPath ? `/uploads/${docPath}` : null);

    if (Array.isArray(progress.documents) && progress.documents.length > 0) {
      const names = progress.documents.map((d) => d.name);
      const paths = progress.documents.map((d) => d.path ?? null);
      const urls = progress.documents.map((d) => d.url ?? (d.path ? `/uploads/${d.path}` : null));
      docName = JSON.stringify(names);
      docPath = JSON.stringify(paths);
      docUrl = JSON.stringify(urls);
    }

    if (progress.id && progress.id > 0) {
      const existing = await client.query('select id, document_name, document_path, document_url from issue_progress where id = $1', [progress.id]);
      if (existing.rowCount && existing.rowCount > 0) {
        const finalDocName = docName !== null ? docName : existing.rows[0].document_name;
        const finalDocPath = docPath !== null ? docPath : existing.rows[0].document_path;
        const finalDocUrl = docUrl !== null ? docUrl : (finalDocPath ? `/uploads/${finalDocPath}` : existing.rows[0].document_url);

        const { rows } = await client.query(
          `update issue_progress 
           set progress_date = $2, 
               progress_description = $3, 
               responsible_person = $4, 
               result_note = $5, 
               status = $6, 
               document_name = $7, 
               document_path = $8, 
               document_url = $9,
               updated_at = now()
           where id = $1
           returning *`,
          [
            progress.id,
            progress.progress_date,
            progress.progress_description,
            progress.responsible_person ?? null,
            progress.result_note ?? null,
            progress.status,
            finalDocName ?? null,
            finalDocPath ?? null,
            finalDocUrl ?? null,
          ]
        );
        return normalizeIssueProgress(rows[0]);
      }
    }
    const { rows } = await client.query(
      'insert into issue_progress (issue_id, progress_date, progress_description, responsible_person, result_note, status, document_name, document_path, document_url) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
      [progress.issue_id, progress.progress_date, progress.progress_description, progress.responsible_person ?? null, progress.result_note ?? null, progress.status, docName ?? null, docPath ?? null, docUrl ?? null]
    );
    return normalizeIssueProgress(rows[0]);
  });
}

export async function deleteIssueProgressFromDb(id: number): Promise<boolean> {
  const res = await query('delete from issue_progress where id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

