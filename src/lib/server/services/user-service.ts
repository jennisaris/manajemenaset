import 'server-only';
import {
  findUserForLogin,
  findUserByNip,
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
  const nipTrimmed = input.nip?.trim();
  const emailTrimmed = input.email?.trim().toLowerCase();
  const phoneTrimmed = input.phone_number?.trim();

  if (!nipTrimmed || !input.full_name?.trim() || !emailTrimmed || !phoneTrimmed || !input.password?.trim()) {
    throw new Error('NIP, Nama Lengkap, Satuan Kerja, Email, No. Handphone, dan Password wajib diisi.');
  }

  if (!/^\d{9,18}$/.test(nipTrimmed)) {
    throw new Error('NIP harus berupa angka antara 9 hingga 18 digit.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    throw new Error('Format email tidak valid (contoh: nama@domain.com atau nama@ac.id).');
  }

  if (!/^(\+62|62|0)[0-9]{8,13}$/.test(phoneTrimmed.replace(/[\s-]/g, ''))) {
    throw new Error('Nomor handphone/WhatsApp tidak valid. Masukkan nomor angka yang benar (contoh: 08123456789).');
  }

  if (input.password.trim().length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  // Submit/update pending user registration seamlessly
  const user = await createPendingUserRegistration({
    ...input,
    nip: nipTrimmed,
    email: emailTrimmed,
    full_name: input.full_name.trim(),
    phone_number: phoneTrimmed,
  });
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
