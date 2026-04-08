type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const RATE_LIMIT_STORE = new Map<string, RateLimitEntry>();

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = "Too many requests. Please try again shortly.",
) {
  const now = Date.now();
  const previous = RATE_LIMIT_STORE.get(key);

  if (!previous || previous.expiresAt <= now) {
    RATE_LIMIT_STORE.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return;
  }

  if (previous.count >= limit) {
    throw new Error(message);
  }

  RATE_LIMIT_STORE.set(key, {
    count: previous.count + 1,
    expiresAt: previous.expiresAt,
  });
}
