type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.hits >= limit) return false;
  current.hits += 1;
  return true;
}

export function clientKey(request: Request, action: string): string {
  const trustPlatform = process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1";
  const realIp = trustPlatform ? request.headers.get("x-real-ip")?.trim() : "";
  return `${action}:${realIp || "shared"}`;
}

export type LimitDecision = "ok" | "limited" | "unavailable";

/** Database counter shared by every instance. */
export async function sharedAllowance(
  client: { execute: (input: { sql: string; args: Array<string | number> }) => Promise<{ rows: Array<Record<string, unknown>> }> },
  key: string,
  limit: number,
  windowMs: number,
): Promise<Exclude<LimitDecision, "unavailable"> | "unavailable"> {
  const now = Date.now();
  const resetAt = now + windowMs;
  try {
    const result = await client.execute({
      sql: `INSERT INTO rate_limit_bucket (bucket_key, hits, reset_at)
            VALUES (?, 1, ?)
            ON CONFLICT(bucket_key) DO UPDATE SET
              hits = CASE WHEN rate_limit_bucket.reset_at <= ? THEN 1 ELSE rate_limit_bucket.hits + 1 END,
              reset_at = CASE WHEN rate_limit_bucket.reset_at <= ? THEN ? ELSE rate_limit_bucket.reset_at END
            RETURNING hits`,
      args: [key, resetAt, now, now, resetAt],
    });
    const hits = Number(result.rows[0]?.hits ?? 0);
    return hits > limit ? "limited" : "ok";
  } catch {
    return "unavailable";
  }
}

/** Shared across serverless instances through the libSQL database. The in-memory limiter still runs first. */
export async function enforceLimit(
  client: { execute: (input: { sql: string; args: Array<string | number> }) => Promise<{ rows: Array<Record<string, unknown>> }> },
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimitDecision> {
  if (!rateLimit(key, limit, windowMs)) return "limited";
  return sharedAllowance(client, key, limit, windowMs);
}
