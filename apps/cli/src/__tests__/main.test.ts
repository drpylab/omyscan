import { expect, test } from "vitest";
import { runCli } from "../main.js";

test("--json emits deterministic ScanResult", async () => {
  const r = await runCli(["scan", "https://x/", "--json", "--selftest"]);
  expect(r.code).toBe(0);
  expect(() => JSON.parse(r.stdout)).not.toThrow();
});

test("default output is a categorical surface map", async () => {
  const r = await runCli(["scan", "https://x/", "--selftest"]);
  expect(r.stdout).toContain("Agent Surface Map");
  expect(r.stdout.toLowerCase()).not.toContain("vulnerability");
});

test("missing url → usage, code 2", async () => {
  const r = await runCli(["scan"]);
  expect(r.code).toBe(2);
});
