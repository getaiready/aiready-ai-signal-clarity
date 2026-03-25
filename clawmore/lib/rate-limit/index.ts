/**
 * Simple in-memory rate limiter for serverless environments.
 *
 * Note: In Lambda, each instance has its own memory, so this provides
 * approximate rate limiting. For strict limits, use API Gateway throttling
 * or a Redis/DynamoDB-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Preset configurations for common use cases.
 */
export const RATE_LIMITS = {
  /** Strict limit for auth endpoints (login, register) */
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  /** Standard API limit */
  API: { maxRequests: 60, windowSeconds: 60 },
  /** Relaxed limit for read-heavy endpoints */
  READ: { maxRequests: 120, windowSeconds: 60 },
  /** Very strict for expensive operations */
  EXPENSIVE: { maxRequests: 10, windowSeconds: 60 },
} as const;
