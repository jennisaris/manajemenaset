import 'server-only';
import {
  getIssuesFromDb,
  upsertIssueToDb,
  deleteIssueFromDb,
  getIssueProgressFromDb,
  upsertIssueProgressToDb
} from '@/lib/server/repositories/issue-repository';
import type { AssetIssue, IssueProgress } from '@/lib/types';

export async function fetchAllIssues(): Promise<AssetIssue[]> {
  return getIssuesFromDb();
}

export async function saveIssue(issue: AssetIssue, isNew = false): Promise<AssetIssue> {
  return upsertIssueToDb(issue, isNew);
}

export async function removeIssue(issueId: number): Promise<void> {
  if (!issueId || issueId <= 0) {
    throw new Error('ID Masalah tidak valid.');
  }
  return deleteIssueFromDb(issueId);
}

export async function fetchAllIssueProgress(): Promise<IssueProgress[]> {
  return getIssueProgressFromDb();
}

export async function saveIssueProgress(progress: IssueProgress): Promise<IssueProgress> {
  return upsertIssueProgressToDb(progress);
}
