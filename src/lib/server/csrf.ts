import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { requireAuthSecret } from '@/lib/backend-config';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a CSRF token signed with AUTH_SECRET.
 * Token format: random-data.timestamp.hmac-signature
 */
export function generateCsrfToken(): string {
  const secret = requireAuthSecret();
  const random = randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${random}.${timestamp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Validate a CSRF token from header against the token from cookie.
 * Uses double-submit cookie pattern.
 */
export function validateCsrfToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  const secret = requireAuthSecret();

  // Verify both tokens are valid signed tokens
  if (!verifyTokenSignature(cookieToken, secret)) return false;
  if (!verifyTokenSignature(headerToken, secret)) return false;

  // Timing-safe comparison of the two tokens
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyTokenSignature(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [random, timestamp, signature] = parts;
  const payload = `${random}.${timestamp}`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
