import 'server-only';

export type PasswordValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates password strength.
 * Requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password wajib diisi.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password minimal 8 karakter.' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password maksimal 128 karakter.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password harus mengandung minimal 1 huruf besar (A-Z).' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password harus mengandung minimal 1 huruf kecil (a-z).' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password harus mengandung minimal 1 angka (0-9).' };
  }

  return { valid: true };
}
