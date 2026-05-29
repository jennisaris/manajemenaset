import { apiJson } from './api-client';
import type { AssetIssue, IssueProgress } from './types';

type PersistIssueResult = {
  issue: AssetIssue;
  mode: 'postgres' | 'demo';
};

export async function persistIssue(issue: AssetIssue, options: { isNew?: boolean } = {}): Promise<PersistIssueResult> {
  return apiJson<PersistIssueResult>('/api/issues', { method: 'POST', body: JSON.stringify({ issue, isNew: options.isNew }) });
}

export async function deleteIssue(issueId: number): Promise<{ mode: 'postgres' | 'demo' }> {
  return apiJson<{ mode: 'postgres' | 'demo' }>(`/api/issues?id=${issueId}`, { method: 'DELETE' });
}

export async function getIssueProgress(): Promise<IssueProgress[]> {
  // Local PostgreSQL progress endpoint is planned for the next iteration.
  return [];
}

export async function persistIssueProgress(progress: IssueProgress): Promise<{ progress: IssueProgress; mode: 'postgres' | 'demo' }> {
  return { progress, mode: 'demo' };
}
