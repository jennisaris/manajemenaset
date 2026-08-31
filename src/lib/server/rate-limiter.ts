import 'server-only';
import { query } from '@/lib/server/db';

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

// In-memory cache for fast lookups (acts as write-through cache)
const rateLimitCache = new Map<string, RateLimitRecord>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredCache() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitCache.entries()) {
    if (now >= record.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  totalLimit: number;
};

/**
 * Ensure the rate_limits table exists in PostgreSQL.
 */
let tableEnsured = false;
async function ensureRateLimitTable() {
  if (tableEnsured) return;
  await query(`
    create table if not exists rate_limits (
      key text primary key,
      count integer not null default 1,
      reset_time bigint not null
    )
  `);
  await query(`create index if not exists idx_rate_limits_reset_time on rate_limits (reset_time)`);
  tableEnsured = true;
}

/**
 * Periodic DB cleanup of expired rate limit rows
 */
let lastDbCleanup = Date.now();
const DB_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
async function cleanupExpiredDb() {
  const now = Date.now();
  if (now - lastDbCleanup < DB_CLEANUP_INTERVAL_MS) return;
  lastDbCleanup = now;
  await query(`delete from rate_limits where reset_time < $1`, [now]);
}

/**
 * Checks and increments rate limit for a specific identifier.
 * Uses PostgreSQL for persistence across server restarts.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  cleanupExpiredCache();
  const now = Date.now();

  // Fast path: check in-memory cache first
  const cached = rateLimitCache.get(key);
  if (cached && now < cached.resetTime) {
    if (cached.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(1, Math.ceil((cached.resetTime - now) / 1000)),
        totalLimit: maxRequests,
      };
    }
    cached.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - cached.count,
      resetSeconds: Math.max(1, Math.ceil((cached.resetTime - now) / 1000)),
      totalLimit: maxRequests,
    };
  }

  // Slow path: check DB and update atomically
  try {
    await ensureRateLimitTable();

    // Try to insert a new record
    const insertResult = await query(`
      insert into rate_limits (key, count, reset_time)
      values ($1, 1, $2)
      on conflict (key) do update
        set count = case
          when rate_limits.reset_time < $3 then 1
          else rate_limits.count + 1
        end,
        reset_time = case
          when rate_limits.reset_time < $3 then $2
          else rate_limits.reset_time
        end
      returning count, reset_time
    `, [key, now + windowMs, now]);

    const row = insertResult.rows[0];
    const record: RateLimitRecord = {
      count: row.count,
      resetTime: row.reset_time,
    };

    // Update in-memory cache
    rateLimitCache.set(key, record);

    // Periodic DB cleanup
    cleanupExpiredDb();

    if (record.count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
        totalLimit: maxRequests,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
      totalLimit: maxRequests,
    };
  } catch (err) {
    // Fallback to in-memory only if DB is unavailable
    console.warn('Rate limiter DB error, falling back to in-memory:', err);
    const fallbackRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitCache.set(key, fallbackRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
      totalLimit: maxRequests,
    };
  }
}

/**
 * Resets rate limit for a given key (e.g. on successful login)
 */
export async function resetRateLimit(key: string): Promise<void> {
  rateLimitCache.delete(key);
  try {
    await ensureRateLimitTable();
    await query(`delete from rate_limits where key = $1`, [key]);
  } catch (err) {
    console.warn('Rate limiter reset DB error:', err);
  }
}

/**
 * Clears all rate limit records (for testing purposes)
 */
export async function clearRateLimitStore(): Promise<void> {
  rateLimitCache.clear();
  try {
    await ensureRateLimitTable();
    await query(`delete from rate_limits`);
  } catch {
    // ignore
  }
}
