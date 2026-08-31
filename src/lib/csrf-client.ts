/**
 * Client-side CSRF token helper.
 * Reads the csrf_token cookie and returns it for use in request headers.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns headers object with CSRF token included.
 * Use this for all state-changing fetch requests.
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}
