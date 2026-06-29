import { expect, test } from "vitest";
import { buildDemoResponse } from "../demo.js";

test("demo result is rich and deterministic", () => {
  const a = buildDemoResponse();
  const b = buildDemoResponse();
  expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // deterministic
  expect(a.is_demo).toBe(true);
  const s = a.summary as { total_findings: number; visible_findings: number; locked_findings: number };
  expect(s.total_findings).toBeGreaterThanOrEqual(25); // AC#3
  expect(s.visible_findings).toBe(10); // AC#4
  expect(s.locked_findings).toBeGreaterThanOrEqual(15); // AC#4
});

test("demo surfaces risk stories and is lexicon-clean", () => {
  const a = buildDemoResponse();
  const stories = a.risk_stories as { story_id: string }[];
  expect(stories.length).toBeGreaterThanOrEqual(3); // AC#14: combinations matched
  expect(JSON.stringify(a).toLowerCase()).not.toContain("vulnerability");
  expect(JSON.stringify(a)).not.toContain("/100");
});

test("demo low_surface is false (rich)", () => {
  expect(buildDemoResponse().low_surface).toBe(false);
});
