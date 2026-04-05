/**
 * Rate limiter using Upstash Redis REST API
 * Implements sliding window counter per user and per tenant
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisCommand(command: string[]): Promise<unknown> {
  const res = await fetch(`${REDIS_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    throw new Error(`Redis error: ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given key
 * @param key - Rate limit key (e.g., `user:${userId}` or `tenant:${tenantId}`)
 * @param maxRequests - Maximum requests per window
 * @param windowSeconds - Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  // Increment counter
  const count = (await redisCommand(["INCR", windowKey])) as number;

  // Set expiry on first hit
  if (count === 1) {
    await redisCommand(["EXPIRE", windowKey, String(windowSeconds)]);
  }

  const resetAt = new Date(
    (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000
  );

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetAt,
  };
}

/**
 * Rate limit middleware config (from architecture doc):
 * - 100 req/min/user
 * - 1000 req/min/tenant
 */
export async function rateLimitUser(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, 100, 60);
}

export async function rateLimitTenant(tenantId: string): Promise<RateLimitResult> {
  return checkRateLimit(`tenant:${tenantId}`, 1000, 60);
}

/**
 * Simple cache get/set via Upstash
 */
export async function cacheGet(key: string): Promise<string | null> {
  const result = await redisCommand(["GET", `cache:${key}`]);
  return result as string | null;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await redisCommand(["SET", `cache:${key}`, value, "EX", String(ttlSeconds)]);
}
