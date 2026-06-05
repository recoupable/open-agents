import type Redis from "ioredis";
import {
  createRedisClient,
  isRedisConfigured,
  warnRedisDisabled,
} from "@/lib/redis";

let cachedClient: Redis | null = null;
let warnedClientFailure = false;

function getRateLimitClient(): Redis | null {
  if (!isRedisConfigured()) {
    warnRedisDisabled("rate-limit");
    return null;
  }
  if (cachedClient) {
    return cachedClient;
  }
  try {
    cachedClient = createRedisClient("rate-limit");
    return cachedClient;
  } catch (error) {
    if (!warnedClientFailure) {
      warnedClientFailure = true;
      console.error("[rate-limit] failed to create Redis client:", error);
    }
    return null;
  }
}

export interface RateLimitOptions {
  /** Logical bucket id, e.g. `sandbox:create:user_abc`. Must be unique per route+identity. */
  key: string;
  /** Maximum events allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export type RateLimitResult =
  | {
      ok: true;
      limit: number;
      remaining: number;
      resetAt: Date;
    }
  | {
      ok: false;
      response: Response;
    };

interface RateLimitState {
  count: number;
  ttlSec: number;
}

async function incrementBucket(
  client: Redis,
  redisKey: string,
  windowSec: number,
): Promise<RateLimitState | null> {
  try {
    const pipeline = client.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, windowSec, "NX");
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();
    if (!results) {
      return null;
    }

    const [incrErr, incrVal] = results[0] ?? [];
    const [, ttlVal] = results[2] ?? [];
    if (incrErr || typeof incrVal !== "number") {
      return null;
    }

    const ttlSec =
      typeof ttlVal === "number" && ttlVal > 0 ? ttlVal : windowSec;

    return { count: incrVal, ttlSec };
  } catch (error) {
    console.error("[rate-limit] redis pipeline failed:", error);
    return null;
  }
}

function build429Response(
  limit: number,
  resetAt: Date,
  retryAfterSec: number,
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Slow down.",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfterSec),
        "x-ratelimit-limit": String(limit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.floor(resetAt.getTime() / 1000)),
      },
    },
  );
}

/**
 * Fixed-window rate limit backed by Redis INCR + EXPIRE NX.
 *
 * Behavior:
 *  - Returns { ok: true } if the request is allowed.
 *  - Returns { ok: false, response } with a 429 if the limit is exceeded.
 *  - Fails OPEN if Redis is unavailable or errors — we log and allow the
 *    request through so a Redis outage does not take down the API.
 *    For endpoints where fail-open is unacceptable (e.g. money-moving),
 *    wrap this and reject when the result has no Redis-backed evidence.
 */
export async function enforceRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const client = getRateLimitClient();
  if (!client) {
    return {
      ok: true,
      limit: opts.limit,
      remaining: opts.limit,
      resetAt: new Date(Date.now() + opts.windowSec * 1000),
    };
  }

  const redisKey = `ratelimit:${opts.key}`;
  const state = await incrementBucket(client, redisKey, opts.windowSec);
  if (!state) {
    return {
      ok: true,
      limit: opts.limit,
      remaining: opts.limit,
      resetAt: new Date(Date.now() + opts.windowSec * 1000),
    };
  }

  const resetAt = new Date(Date.now() + state.ttlSec * 1000);
  const remaining = Math.max(0, opts.limit - state.count);

  if (state.count > opts.limit) {
    return {
      ok: false,
      response: build429Response(opts.limit, resetAt, state.ttlSec),
    };
  }

  return { ok: true, limit: opts.limit, remaining, resetAt };
}

/**
 * Resolve the calling client's IP for rate-limit bucketing on
 * unauthenticated paths. Vercel sets `x-forwarded-for`; the leftmost
 * entry is the original client.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Per-endpoint limits. Tuned for "expensive enterprise demo abuse",
 * not for benign normal use. Adjust based on observed real-user p95.
 */
export const RATE_LIMITS = {
  sandboxCreate: { limit: 10, windowSec: 60 * 60 },
  sandboxExtend: { limit: 30, windowSec: 60 * 60 },
  sandboxSnapshot: { limit: 60, windowSec: 60 * 60 },
  transcribe: { limit: 30, windowSec: 60 * 60 },
  llmCheap: { limit: 60, windowSec: 60 * 60 },
  llmExpensive: { limit: 30, windowSec: 60 * 60 },
} as const satisfies Record<string, { limit: number; windowSec: number }>;