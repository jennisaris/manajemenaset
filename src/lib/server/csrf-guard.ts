import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/server/csrf';

/**
 * Validates CSRF token for state-changing requests using double-submit cookie pattern.
 * Returns null if valid, or a NextResponse 403 error if invalid.
 */
export async function requireCsrf(): Promise<NextResponse | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const method = headerStore.get('x-http-method-override')?.toUpperCase()
    || headerStore.get('x-method-override')?.toUpperCase()
    || 'GET';

  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null;

  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = headerStore.get(CSRF_HEADER_NAME) ?? undefined;

  if (!validateCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'CSRF token tidak valid. Silakan muat ulang halaman.' },
      { status: 403 }
    );
  }

  // Defense-in-depth: check Origin/Referer header
  const origin = headerStore.get('origin');
  const referer = headerStore.get('referer');
  const host = headerStore.get('host');

  if (host) {
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      `http://localhost:${host.split(':').pop() || '3000'}`,
    ];

    const requestOrigin = origin || referer;
    if (requestOrigin) {
      try {
        const url = new URL(requestOrigin);
        const requestBase = `${url.protocol}//${url.host}`;
        if (!allowedOrigins.some(allowed => requestBase.startsWith(allowed))) {
          return NextResponse.json(
            { error: 'Origin tidak valid.' },
            { status: 403 }
          );
        }
      } catch {
        // Malformed origin/referer — reject
        return NextResponse.json(
          { error: 'Origin tidak valid.' },
          { status: 403 }
        );
      }
    }
  }

  return null;
}
