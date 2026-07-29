import 'server-only';
import {
  findUserForLogin,
  updateOwnPassword,
  createPendingUserRegistration,
  getPendingRegistrationsFromDb,
  getAllUsersFromDb,
  approveUserRegistration,
  rejectUserRegistration,
} from '@/lib/server/repositories/user-repository';
import { sendRegistrationReceivedEmail, sendApprovalStatusEmail } from '@/lib/server/services/email-service';
import type { UserRegistrationInput, UserRole } from '@/lib/types';

export async function authenticateUser(email: string) {
  return findUserForLogin(email);
}

export async function changeUserPassword(userId: string, currentPassword: string, nextPassword: string) {
  return updateOwnPassword(userId, currentPassword, nextPassword);
}

export async function registerUser(input: UserRegistrationInput) {
  if (!input.nip || !input.full_name || !input.email || !input.password) {
    throw new Error('NIP, Nama Lengkap, Email, dan Password wajib diisi.');
  }

  const existing = await findUserForLogin(input.email);
  if (existing) {
    throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
  }

  const user = await createPendingUserRegistration(input);
  await sendRegistrationReceivedEmail(user);
  return user;
}

export async function fetchPendingUsers() {
  return getPendingRegistrationsFromDb();
}

export async function fetchAllUsers() {
  return getAllUsersFromDb();
}

export async function approveUser(userId: string, roleName: UserRole, campusName?: string) {
  const updatedUser = await approveUserRegistration(userId, roleName, campusName);
  await sendApprovalStatusEmail(updatedUser, true);
  return updatedUser;
}

export async function rejectUser(userId: string, reason?: string) {
  const updatedUser = await rejectUserRegistration(userId, reason);
  await sendApprovalStatusEmail(updatedUser, false, reason);
  return updatedUser;
}
