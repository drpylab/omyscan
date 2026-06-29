import { expect, test } from "vitest";
import { llmsTxtProbe } from "../llmsTxt.js";
import type { ProbeContext, FetchOutcome } from "../../types.js";

const ok = (over: Partial<FetchOutcome> = {}): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "text/plain", contentTypeMatch: true, bytes: 500,
  body: "# Docs\n- [API](https://x/api.md)\n" + "x".repeat(300), oversize: false, ...over,
});

test("detected when text/plain llms.txt present", async () => {
  const ctx: ProbeContext = { origin: "https://x", baseUrl: "https://x", fetch: async () => ok() };
  const r = await llmsTxtProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("detected");
});

test("unverified on html soft-404 (pinning failed)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => ok({ contentTypeMatch: false, body: null, contentTypeActual: "text/html" }),
  };
  const r = await llmsTxtProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("unverified");
});

test("detected on large llms.txt that trips 64KiB cap (presence via 2xx+text/plain)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => ok({ oversize: true, body: null, bytes: 95000, contentTypeMatch: true }),
  };
  const r = await llmsTxtProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("detected");
});
