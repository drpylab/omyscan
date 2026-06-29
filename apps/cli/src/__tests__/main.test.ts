import { expect, test } from "vitest";
import { runCli } from "../main.js";

test("--json emits deterministic ScanResult", async () => {
  const r = await runCli(["scan", "https://x/", "--json", "--selftest"]);
  expect(r.code).toBe(0);
  expect(() => JSON.parse(r.stdout)).not.toThrow();
});

test("default output shows new signal + action sections, no scary wording", async () => {
  const r = await runCli(["scan", "https://x/", "--selftest"]);
  expect(r.stdout).toContain("Agent-facing signals:");
  expect(r.stdout).toContain("Action surface:");
  expect(r.stdout).toContain("OpenAPI surface detected");
  expect(r.stdout).toContain("write: possible");
  expect(r.stdout.toLowerCase()).not.toContain("vulnerability");
  expect(r.stdout).not.toContain("/100");
});

test("--json output follows Evidence Contract (every signal has evidence)", async () => {
  const r = await runCli(["scan", "https://x/", "--json", "--selftest"]);
  const parsed = JSON.parse(r.stdout) as { signals: { evidence?: { url: string; contentTypeMatch: boolean } }[] };
  expect(parsed.signals.length).toBeGreaterThan(0);
  for (const s of parsed.signals) {
    expect(s.evidence).toBeTruthy();
    expect(typeof s.evidence!.url).toBe("string");
    expect(typeof s.evidence!.contentTypeMatch).toBe("boolean");
  }
});

test("missing url → usage, code 2", async () => {
  const r = await runCli(["scan"]);
  expect(r.code).toBe(2);
});
