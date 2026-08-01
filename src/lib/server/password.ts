import 'server-only';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const iterations = 210_000;
const keyLength = 32;
const digest = 'sha256';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('base64url');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [scheme, iterationText, salt, hash] = storedHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationText || !salt || !hash) return false;
  const next = pbkdf2Sync(password, salt, Number(iterationText), keyLength, digest).toString('base64url');
  const a = Buffer.from(next);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
