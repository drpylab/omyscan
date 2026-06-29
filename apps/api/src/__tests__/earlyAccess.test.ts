import { expect, test } from "vitest";
import { handleEarlyAccess } from "../earlyAccess.js";
import { createStorage } from "../storage.js";

const mem = () => createStorage({ dbPath: ":memory:", salt: "test" });

test("valid email → ok; lead stored, lowercased, host-only (no query)", () => {
  const s = mem();
  const r = handleEarlyAccess(
    { email: "User@Example.com ", target: "https://docs.langchain.com/x?q=secret", total_findings: 12, locked_findings: 2 },
    { storage: s },
  );
  expect(r.status).toBe(200);
  expect(r.body.status).toBe("ok");
  const csv = s.leadsCsv();
  expect(csv).toContain("user@example.com"); // normalized
  expect(csv).toContain("docs.langchain.com");
  expect(csv).not.toContain("secret"); // full URL / query never stored
  s.close();
});

test("invalid email → error, nothing stored", () => {
  const s = mem();
  const r = handleEarlyAccess({ email: "not-an-email" }, { storage: s });
  expect(r.status).toBe(400);
  expect(s.metrics().total_leads).toBe(0);
  s.close();
});

test("submission records an analytics event (no email)", () => {
  const s = mem();
  handleEarlyAccess({ email: "secret@example.com", target: "https://x.com" }, { storage: s });
  expect(s.metrics().early_access_submitted).toBe(1);
  s.close();
});
