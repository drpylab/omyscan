import { expect, test } from "vitest";
import { guardUrl, type Resolver } from "../ssrfGuard.js";

// resolver that never gets to resolve a public host (literal IP / scheme cases)
const noDns: Resolver = async () => {
  throw new Error("resolver should not be called");
};
const publicDns: Resolver = async () => ["93.184.216.34"];
const privateDns: Resolver = async () => ["10.0.0.5"]; // hostname that resolves to private (DNS rebinding)

const MUST_BLOCK = [
  "http://localhost/", "http://sub.localhost/", "http://127.0.0.1/", "http://0.0.0.0/",
  "http://[::1]/", "http://10.0.0.1/", "http://172.16.0.1/", "http://192.168.1.1/",
  "http://169.254.169.254/latest/meta-data/", "file:///etc/passwd", "gopher://x/", "ftp://x/",
  "data:text/plain,hi", "javascript:alert(1)", "https://user:pass@example.com/",
];

test.each(MUST_BLOCK)("blocks %s", async (url) => {
  const r = await guardUrl(url, noDns);
  expect(r.allowed).toBe(false);
  expect(r.message).toBe("This target is not allowed for hosted scanning.");
});

test("blocks hostname that resolves to a private IP (DNS rebinding)", async () => {
  const r = await guardUrl("https://evil.example.com/", privateDns);
  expect(r.allowed).toBe(false);
  expect(r.reason).toBe("private_or_reserved_target");
});

const MUST_ALLOW = ["https://example.com/", "https://docs.stripe.com/", "https://docs.langchain.com/"];
test.each(MUST_ALLOW)("allows public %s", async (url) => {
  const r = await guardUrl(url, publicDns);
  expect(r.allowed).toBe(true);
});

test("redirect target to private IP is blocked", async () => {
  const r = await guardUrl("http://10.0.0.5/", noDns);
  expect(r.allowed).toBe(false);
  expect(r.reason).toBe("private_or_reserved_target");
});
