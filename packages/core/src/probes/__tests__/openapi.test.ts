import { expect, test } from "vitest";
import { openapiProbe } from "../openapi.js";
import type { ProbeContext, FetchOutcome } from "../../types.js";

const SPEC = JSON.stringify({
  openapi: "3.0.0",
  paths: {
    "/users": { get: { operationId: "listUsers", summary: "list" }, post: { summary: "create user" } },
    "/users/{id}": { delete: { summary: "remove" } },
    "/files/upload": { post: { summary: "upload file" } },
  },
});

const base = (over: Partial<FetchOutcome>): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "application/json", contentTypeMatch: true, bytes: SPEC.length,
  body: SPEC, oversize: false, ...over,
});

function ctx(fetch: ProbeContext["fetch"]): ProbeContext {
  return { origin: "https://x", baseUrl: "https://x", fetch };
}

test("real JSON OpenAPI → detected + action classes", async () => {
  const r = await openapiProbe.run(
    ctx(async (u) => (u.endsWith("/openapi.json") ? base({}) : base({ contentTypeMatch: false, body: null, httpStatus: 404 }))),
  );
  expect(r.signals.some((s) => s.category === "openapi" && s.verdict === "detected")).toBe(true);
  const actions = r.signals.filter((s) => s.category === "action-surface" && s.verdict === "detected").map((s) => s.label);
  expect(actions).toContain("read");
  expect(actions).toContain("write");
  expect(actions).toContain("delete");
  expect(actions).toContain("upload");
});

test("HTML soft-404 → not detected (unverified, never detected)", async () => {
  const r = await openapiProbe.run(
    ctx(async () => base({ contentTypeActual: "text/html", contentTypeMatch: false, body: null, bytes: 99999 })),
  );
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
});

test("oversized OpenAPI → presence detected but not parsed (no action classes)", async () => {
  const r = await openapiProbe.run(
    ctx(async (u) => (u.endsWith("/openapi.json") ? base({ oversize: true, body: null, bytes: 200000 }) : base({ contentTypeMatch: false, body: null, httpStatus: 404 }))),
  );
  expect(r.signals.some((s) => s.category === "openapi" && s.verdict === "detected")).toBe(true);
  expect(r.signals.some((s) => s.category === "action-surface" && s.verdict === "detected")).toBe(false);
});

test("wrong content-type → skipped (unverified)", async () => {
  const r = await openapiProbe.run(
    ctx(async () => base({ contentTypeActual: "text/plain", contentTypeMatch: false, body: null })),
  );
  expect(r.signals.filter((s) => s.category === "openapi").every((s) => s.verdict === "unverified")).toBe(true);
});
