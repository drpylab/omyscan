import { afterEach, expect, test } from "vitest";
import { handleEarlyAccess, type EarlyAccessRecord } from "../earlyAccess.js";
import { setSink } from "../analytics.js";

afterEach(() => setSink((e) => process.stdout.write(JSON.stringify(e) + "\n")));

test("valid email → ok, stored with host-only target", () => {
  setSink(() => {});
  const stored: EarlyAccessRecord[] = [];
  const r = handleEarlyAccess(
    { email: "user@example.com", target: "https://docs.langchain.com/x?q=1", total_findings: 12, locked_findings: 2 },
    { store: (rec) => stored.push(rec) },
  );
  expect(r.status).toBe(200);
  expect(r.body.status).toBe("ok");
  expect(stored[0]!.email).toBe("user@example.com");
  expect(stored[0]!.target_host).toBe("docs.langchain.com"); // no path/query stored
});

test("invalid email → error, nothing stored", () => {
  setSink(() => {});
  const stored: EarlyAccessRecord[] = [];
  const r = handleEarlyAccess({ email: "not-an-email" }, { store: (rec) => stored.push(rec) });
  expect(r.status).toBe(400);
  expect(r.body.status).toBe("error");
  expect(stored).toHaveLength(0);
});

test("analytics event for submission carries NO email", () => {
  const events: unknown[] = [];
  setSink((e) => events.push(e));
  handleEarlyAccess({ email: "secret@example.com", target: "https://x.com" }, { store: () => {} });
  expect(JSON.stringify(events)).not.toContain("secret@example.com");
  expect(JSON.stringify(events)).toContain("early_access_submitted");
});
