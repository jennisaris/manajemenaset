import 'server-only';

// Domain Repositories & Utilities
export {
  parseJson,
  normalizeAsset,
  getAssetsFromDb,
  upsertAssetToDb,
  deleteAssetFromDb,
} from '@/lib/server/repositories/asset-repository';

export {
  parseUtilizationMeta,
  normalizeUtilization,
  getUtilizationsFromDb,
  upsertUtilizationToDb,
  deleteUtilizationFromDb,
} from '@/lib/server/repositories/utilization-repository';

export {
  normalizeIssue,
  normalizeIssueProgress,
  ensureIssueProgressUploadColumns,
  getIssuesFromDb,
  upsertIssueToDb,
  deleteIssueFromDb,
  getIssueProgressFromDb,
  upsertIssueProgressToDb,
} from '@/lib/server/repositories/issue-repository';

export {
  findUserForLogin,
  updateOwnPassword,
  createPendingUserRegistration,
  getPendingRegistrationsFromDb,
  getAllUsersFromDb,
  approveUserRegistration,
  rejectUserRegistration,
} from '@/lib/server/repositories/user-repository';

export {
  getSatkerListFromDb,
} from '@/lib/server/repositories/satker-repository';

export {
  getBmnAssetsFromDb,
  upsertBmnAssetToDb,
  deleteBmnAssetFromDb,
} from '@/lib/server/repositories/bmn-repository';

export {
  getDisposalsFromDb,
  createDisposalInDb,
  deleteDisposalFromDb,
  parseLampiranRecap,
} from '@/lib/server/repositories/disposal-repository';



// Domain Services
export {
  fetchAllAssets,
  saveAsset,
  removeAsset,
} from '@/lib/server/services/asset-service';

export {
  fetchAllUtilizations,
  saveUtilization,
  removeUtilization,
} from '@/lib/server/services/utilization-service';

export {
  fetchAllIssues,
  saveIssue,
  removeIssue,
  fetchAllIssueProgress,
  saveIssueProgress,
} from '@/lib/server/services/issue-service';

export {
  authenticateUser,
  changeUserPassword,
  registerUser,
  fetchPendingUsers,
  fetchAllUsers,
  approveUser,
  rejectUser,
} from '@/lib/server/services/user-service';

export {
  getDashboardSummary as getDashboardSummaryFromDb,
  getMvpData as getMvpDataFromDb,
} from '@/lib/server/services/dashboard-service';
