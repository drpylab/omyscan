import { expect, test } from "vitest";
import { oauthProbe } from "../oauth.js";
import type { ProbeContext, FetchOutcome } from "../../types.js";

const META = JSON.stringify({
  issuer: "https://x",
  authorization_endpoint: "https://x/authorize",
  token_endpoint: "https://x/token",
  scopes_supported: ["read", "write"],
});

const base = (over: Partial<FetchOutcome>): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "application/json", contentTypeMatch: true, bytes: META.length,
  body: META, oversize: false, ...over,
});
const ctx = (fetch: ProbeContext["fetch"]): ProbeContext => ({ origin: "https://x", baseUrl: "https://x", fetch });

test("valid JSON metadata → detected", async () => {
  const r = await oauthProbe.run(
    ctx(async (u) => (u.endsWith("openid-configuration") ? base({}) : base({ contentTypeMatch: false, body: null, httpStatus: 404 }))),
  );
  expect(r.signals.some((s) => s.verdict === "detected")).toBe(true);
});

test("HTML soft-404 → skipped (never detected)", async () => {
  const r = await oauthProbe.run(
    ctx(async () => base({ contentTypeActual: "text/html", contentTypeMatch: false, body: null, bytes: 80000 })),
  );
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
});

test("malformed JSON → unverified, not detected", async () => {
  const r = await oauthProbe.run(ctx(async () => base({ body: "{ not json" })));
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
  expect(r.signals.some((s) => s.verdict === "unverified")).toBe(true);
});
