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
  const result = await apiJson<{ progress: IssueProgress[]; mode: 'postgres' | 'demo' }>('/api/issues/progress');
  return result.progress;
}

export async function persistIssueProgress(progress: IssueProgress): Promise<{ progress: IssueProgress; mode: 'postgres' | 'demo' }> {
  return apiJson<{ progress: IssueProgress; mode: 'postgres' | 'demo' }>('/api/issues/progress', { method: 'POST', body: JSON.stringify(progress) });
}
