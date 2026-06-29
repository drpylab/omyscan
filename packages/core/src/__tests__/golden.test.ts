import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { mcpManifestProbe } from "../probes/mcpManifest.js";
import type { FetchOutcome, ProbeContext } from "../types.js";

function ctxFrom(file: string): ProbeContext {
  const map = JSON.parse(
    readFileSync(new URL(`../../__fixtures__/${file}`, import.meta.url), "utf8"),
  ) as Record<string, FetchOutcome>;
  return {
    origin: "https://x",
    baseUrl: "https://x",
    fetch: async (u) =>
      map[new URL(u).pathname] ?? {
        url: u, finalUrl: u, httpStatus: 404, redirectCount: 0,
        contentTypeActual: null, contentTypeMatch: false, bytes: 0, body: null, oversize: false,
      },
  };
}

test("0 FP: soft-404 catch-all never yields detected", async () => {
  const r = await mcpManifestProbe.run(ctxFrom("soft404/cursor.json"));
  expect(r.signals.every((s) => s.verdict !== "detected")).toBe(true);
});

test("recall: real json manifest → detected", async () => {
  const r = await mcpManifestProbe.run(ctxFrom("real-manifest/langchain-mcp.json"));
  expect(r.signals.some((s) => s.verdict === "detected")).toBe(true);
});
