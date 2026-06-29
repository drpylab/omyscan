import { expect, test } from "vitest";
import { makeEvidence, type Signal } from "../types.js";

test("evidence carries pinning + size fields", () => {
  const ev = makeEvidence({
    probeId: "llms", url: "https://x/llms.txt", method: "GET",
    httpStatus: 200, finalUrl: "https://x/llms.txt", redirectCount: 0,
    contentTypeExpected: "text/plain", contentTypeActual: "text/plain; charset=utf-8",
    contentTypeMatch: true, bytes: 1234,
  });
  const sig: Signal = { category: "discoverability", verdict: "detected", evidence: ev };
  expect(sig.evidence.contentTypeMatch).toBe(true);
  expect(sig.evidence.bytes).toBeLessThanOrEqual(65536);
  expect(typeof sig.evidence.fetchedAt).toBe("string");
});
