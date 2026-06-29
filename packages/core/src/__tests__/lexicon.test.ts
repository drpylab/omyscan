import { expect, test } from "vitest";
import { formatReport, FORBIDDEN, assertLexicon } from "../lexicon.js";
import type { ScanResult } from "../scanner.js";

const r: ScanResult = {
  target: "https://x",
  signals: [
    {
      category: "ai-bot-policy",
      verdict: "not-detected",
      evidence: {
        probeId: "ai-bot-policy", url: "https://x/robots.txt", method: "GET", httpStatus: 200,
        finalUrl: "https://x/robots.txt", redirectCount: 0, contentTypeExpected: "text/plain",
        contentTypeActual: "text/plain", contentTypeMatch: true, bytes: 50, fetchedAt: "t",
      },
    },
  ],
};

test("report contains allowed wording, never forbidden", () => {
  const out = formatReport(r);
  for (const bad of FORBIDDEN) expect(out.toLowerCase()).not.toContain(bad.toLowerCase());
  expect(out).toContain("AI bot policy gap");
});

test("assertLexicon throws on forbidden token", () => {
  expect(() => assertLexicon("this is a vulnerability")).toThrow();
});
