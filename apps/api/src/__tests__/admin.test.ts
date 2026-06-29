import { expect, test } from "vitest";
import { handleMetrics, handleLeadsCsv } from "../admin.js";
import { createStorage } from "../storage.js";

const s = createStorage({ dbPath: ":memory:", salt: "t" });

test("metrics endpoint requires the correct admin token", () => {
  expect(handleMetrics("wrong", s, "secret").status).toBe(403);
  expect(handleMetrics(null, s, "secret").status).toBe(403);
  expect(handleMetrics("secret", s, "secret").status).toBe(200);
});

test("metrics denies when no admin token is configured (safe default)", () => {
  expect(handleMetrics("anything", s, undefined).status).toBe(403);
  expect(handleMetrics("anything", s, "").status).toBe(403);
});

test("leads.csv endpoint requires the correct admin token", () => {
  expect(handleLeadsCsv("wrong", s, "secret").status).toBe(403);
  const ok = handleLeadsCsv("secret", s, "secret");
  expect(ok.status).toBe(200);
  expect(ok.contentType).toContain("csv");
});
