import { expect, test } from "vitest";
import { scan } from "../scanner.js";
import { llmsTxtProbe } from "../probes/llmsTxt.js";
import type { FetchOutcome } from "../types.js";

const good: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "text/plain", contentTypeMatch: true, bytes: 500,
  body: "# Docs\n" + "x".repeat(300), oversize: false,
};

test("deterministic: same input → identical JSON", async () => {
  const fetch = async () => good;
  const a = await scan("https://x/", { probes: [llmsTxtProbe], fetch });
  const b = await scan("https://x/", { probes: [llmsTxtProbe], fetch });
  expect(JSON.stringify(a.signals.map((s) => ({ c: s.category, v: s.verdict })))).toBe(
    JSON.stringify(b.signals.map((s) => ({ c: s.category, v: s.verdict }))),
  );
});

test("normalizes origin from url", async () => {
  const seen: string[] = [];
  await scan("https://x/docs/page", {
    probes: [llmsTxtProbe],
    fetch: async (u) => {
      seen.push(u);
      return good;
    },
  });
  expect(seen[0]).toBe("https://x/llms.txt");
});
