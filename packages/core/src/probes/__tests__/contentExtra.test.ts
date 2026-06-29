import { expect, test } from "vitest";
import { contentExtraProbe } from "../contentExtra.js";
import type { FetchOutcome, ProbeContext } from "../../types.js";

const ok = (ct: string): FetchOutcome => ({
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: ct, contentTypeMatch: true, bytes: 500, body: "x".repeat(400), oversize: false,
});
const miss: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 404, redirectCount: 0,
  contentTypeActual: "text/html", contentTypeMatch: false, bytes: 0, body: null, oversize: false,
};

test("detects llms-full.txt and sitemap, skips missing (no noise)", async () => {
  const ctx: ProbeContext = {
    origin: "https://x", baseUrl: "https://x",
    fetch: async (u, exp) => (u.endsWith("/llms-full.txt") ? ok("text/plain") : u.endsWith("/sitemap.xml") ? ok("application/xml") : miss),
  };
  const r = await contentExtraProbe.run(ctx);
  const labels = r.signals.map((s) => s.label).sort();
  expect(labels).toEqual(["llms_full_txt", "sitemap"]);
  expect(r.signals.every((s) => s.verdict === "detected")).toBe(true);
});

test("html soft-404 for ai.txt is not detected", async () => {
  const ctx: ProbeContext = { origin: "https://x", baseUrl: "https://x", fetch: async () => ({ ...miss, httpStatus: 200, contentTypeActual: "text/html", contentTypeMatch: false }) };
  const r = await contentExtraProbe.run(ctx);
  expect(r.signals).toHaveLength(0);
});
