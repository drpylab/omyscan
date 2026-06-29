import { expect, test } from "vitest";
import { isBlockedIp } from "../ipRanges.js";

const BLOCKED = [
  "127.0.0.1", "127.1.2.3", "0.0.0.0", "10.0.0.1", "172.16.0.1", "172.31.255.255",
  "192.168.1.1", "169.254.0.1", "169.254.169.254", "100.64.0.1", "224.0.0.1", "255.255.255.255",
  "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
];

const ALLOWED_PUBLIC = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"];

test.each(BLOCKED)("blocks %s", (ip) => {
  expect(isBlockedIp(ip)).toBe(true);
});

test.each(ALLOWED_PUBLIC)("allows public %s", (ip) => {
  expect(isBlockedIp(ip)).toBe(false);
});

test("invalid IP is treated as blocked (fail closed)", () => {
  expect(isBlockedIp("not-an-ip")).toBe(true);
  expect(isBlockedIp("")).toBe(true);
});
