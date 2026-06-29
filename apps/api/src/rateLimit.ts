interface Bucket {
  minuteStart: number;
  minuteCount: number;
  hourStart: number;
  hourCount: number;
}

export interface RateLimiter {
  check(ip: string): boolean; // true = allowed
}

/** In-memory per-IP rate limiter: default 5/min, 30/hour. */
export function createRateLimiter(perMinute = 5, perHour = 30, now: () => number = Date.now): RateLimiter {
  const buckets = new Map<string, Bucket>();
  return {
    check(ip: string): boolean {
      const t = now();
      let b = buckets.get(ip);
      if (b == null) {
        b = { minuteStart: t, minuteCount: 0, hourStart: t, hourCount: 0 };
        buckets.set(ip, b);
      }
      if (t - b.minuteStart >= 60_000) {
        b.minuteStart = t;
        b.minuteCount = 0;
      }
      if (t - b.hourStart >= 3_600_000) {
        b.hourStart = t;
        b.hourCount = 0;
      }
      if (b.minuteCount >= perMinute || b.hourCount >= perHour) return false;
      b.minuteCount += 1;
      b.hourCount += 1;
      return true;
    },
  };
}
