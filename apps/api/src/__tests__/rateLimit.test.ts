import { expect, test } from "vitest";
import { createRateLimiter } from "../rateLimit.js";

test("allows up to perMinute then blocks", () => {
  let t = 0;
  const rl = createRateLimiter(3, 100, () => t);
  expect(rl.check("ip")).toBe(true);
  expect(rl.check("ip")).toBe(true);
  expect(rl.check("ip")).toBe(true);
  expect(rl.check("ip")).toBe(false); // 4th in same minute
});

test("resets after a minute", () => {
  let t = 0;
  const rl = createRateLimiter(2, 100, () => t);
  expect(rl.check("ip")).toBe(true);
  expect(rl.check("ip")).toBe(true);
  expect(rl.check("ip")).toBe(false);
  t += 61_000;
  expect(rl.check("ip")).toBe(true);
});

test("per-IP isolation", () => {
  let t = 0;
  const rl = createRateLimiter(1, 100, () => t);
  expect(rl.check("a")).toBe(true);
  expect(rl.check("b")).toBe(true);
  expect(rl.check("a")).toBe(false);
});
