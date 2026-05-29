export const databaseUrl = process.env.DATABASE_URL;
export const authSecret = process.env.AUTH_SECRET;
export const isLocalDatabaseConfigured = Boolean(databaseUrl);

export function requireAuthSecret() {
  if (!authSecret || authSecret.length < 24) {
    throw new Error('AUTH_SECRET wajib diisi minimal 24 karakter untuk session lokal.');
  }
  return authSecret;
}
