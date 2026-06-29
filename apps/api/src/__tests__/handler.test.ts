import { expect, test } from "vitest";
import { SsrfBlockedError, type ScanResult } from "@omyscan/core";
import { handleScan } from "../handler.js";
import { createRateLimiter } from "../rateLimit.js";

function ev(url: string) {
  return { probeId: "p", url, method: "GET" as const, httpStatus: 200, finalUrl: url, redirectCount: 0, contentTypeExpected: "x", contentTypeActual: "x", contentTypeMatch: true, bytes: 1, fetchedAt: "t" };
}
const sample: ScanResult = {
  target: "https://example.com",
  signals: [
    { category: "openapi", verdict: "detected", evidence: ev("https://example.com/openapi.json") },
    { category: "ai-bot-policy", verdict: "not-detected", evidence: ev("https://example.com/robots.txt") },
  ],
};
const allowGuard = async () => ({ allowed: true as const });
const openLimiter = createRateLimiter(100, 100);

test("valid URL → completed with preview shape", async () => {
  const r = await handleScan(
    { url: "https://example.com", ip: "1.2.3.4" },
    { limiter: openLimiter, guard: allowGuard, runScan: async () => sample },
  );
  expect(r.status).toBe(200);
  expect(r.body.status).toBe("completed");
  expect(r.body.summary).toBeTruthy();
  expect(r.body.category_counts).toBeTruthy();
  expect(Array.isArray(r.body.visible_findings)).toBe(true);
  expect((r.body.cta as { label: string }).label).toContain("$5");
});

test("blocked URL → blocked_by_ssrf_guard", async () => {
  const r = await handleScan(
    { url: "http://169.254.169.254/", ip: "1.2.3.4" },
    { limiter: openLimiter, guard: async () => ({ allowed: false as const, reason: "private_or_reserved_target" }), runScan: async () => sample },
  );
  expect(r.status).toBe(403);
  expect(r.body.error).toBe("blocked_by_ssrf_guard");
});

test("rate-limited → rate_limited", async () => {
  const r = await handleScan(
    { url: "https://example.com", ip: "9.9.9.9" },
    { limiter: { check: () => false }, guard: allowGuard, runScan: async () => sample },
  );
  expect(r.status).toBe(429);
  expect(r.body.error).toBe("rate_limited");
});

test("redirect to private (SsrfBlockedError) → blocked", async () => {
  const r = await handleScan(
    { url: "https://example.com", ip: "1.2.3.4" },
    { limiter: openLimiter, guard: allowGuard, runScan: async () => { throw new SsrfBlockedError("redirect_to_private_target"); } },
  );
  expect(r.status).toBe(403);
  expect(r.body.error).toBe("blocked_by_ssrf_guard");
});

test("scanner error → safe error response", async () => {
  const r = await handleScan(
    { url: "https://example.com", ip: "1.2.3.4" },
    { limiter: openLimiter, guard: allowGuard, runScan: async () => { throw new Error("boom"); } },
  );
  expect(r.status).toBe(502);
  expect(r.body.error).toBe("scan_failed");
  expect(JSON.stringify(r.body).toLowerCase()).not.toContain("vulnerability");
});
