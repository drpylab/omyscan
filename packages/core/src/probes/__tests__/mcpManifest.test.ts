import { expect, test } from "vitest";
import { mcpManifestProbe } from "../mcpManifest.js";
import type { ProbeContext, FetchOutcome } from "../../types.js";

const o = (over: Partial<FetchOutcome>): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "application/json", contentTypeMatch: true, bytes: 241,
  body: '{"schema":"mcp"}', oversize: false, ...over,
});

test("detected on real json manifest", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async (u) =>
      u.endsWith("mcp.json") ? o({}) : o({ contentTypeMatch: false, body: null, httpStatus: 404 }),
  };
  const r = await mcpManifestProbe.run(ctx);
  expect(r.signals.some((s) => s.verdict === "detected")).toBe(true);
});

test("unverified on html soft-404 catch-all (never detected)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () =>
      o({ contentTypeActual: "text/html", contentTypeMatch: false, body: null, bytes: 135552 }),
  };
  const r = await mcpManifestProbe.run(ctx);
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
});

test("not-detected on json but empty/garbage manifest", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => o({ body: "not json at all", bytes: 14 }),
  };
  const r = await mcpManifestProbe.run(ctx);
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
});
