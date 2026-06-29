import { expect, test } from "vitest";
import { aiBotPolicyProbe, AI_BOTS } from "../aiBotPolicy.js";
import type { ProbeContext, FetchOutcome } from "../../types.js";

const out = (body: string | null, match = true): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: body ? 200 : 404, redirectCount: 0,
  contentTypeActual: "text/plain", contentTypeMatch: match, bytes: body?.length ?? 0,
  body, oversize: false,
});

test("GAP → not-detected when robots has no AI directive", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => out("User-agent: *\nDisallow:"),
  };
  const r = await aiBotPolicyProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("not-detected");
});

test("detected when GPTBot directive present", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => out("User-agent: GPTBot\nDisallow: /"),
  };
  const r = await aiBotPolicyProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("detected");
});

test("not-detected (gap) when robots.txt is genuinely absent (404)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => out(null, false), // httpStatus 404
  };
  const r = await aiBotPolicyProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("not-detected");
});

test("unverified on soft-404 (200 + wrong content-type)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async () => ({
      url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
      contentTypeActual: "text/html", contentTypeMatch: false, bytes: 1000, body: null, oversize: false,
    }),
  };
  const r = await aiBotPolicyProbe.run(ctx);
  expect(r.signals[0]!.verdict).toBe("unverified");
});

test("AI_BOTS includes the major crawlers", () => {
  expect(AI_BOTS).toContain("GPTBot");
  expect(AI_BOTS).toContain("ClaudeBot");
});
