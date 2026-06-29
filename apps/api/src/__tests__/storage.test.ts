import { expect, test } from "vitest";
import { createStorage } from "../storage.js";

const mem = () => createStorage({ dbPath: ":memory:", salt: "test" });

test("event stores hostname only — never full URL / query", () => {
  const s = mem();
  s.insertEvent({ event: "scan_completed", target: "https://docs.langchain.com/guide?token=secret", total_findings: 19, locked_findings: 9, ip: "1.2.3.4", user_agent: "UA" });
  const m = s.metrics();
  expect(m.scan_completed).toBe(1);
  expect(m.total_events).toBe(1);
  expect(m.top_hosts[0]!.host).toBe("docs.langchain.com");
  expect(JSON.stringify(m)).not.toContain("secret");
  s.close();
});

test("ip and user-agent are hashed, never stored raw", () => {
  const s = mem();
  s.insertLead({ email: "a@b.com", target: "https://x.com", ip: "203.0.113.5", user_agent: "Mozilla/5.0 secretUA" });
  const csv = s.leadsCsv();
  expect(csv).not.toContain("203.0.113.5");
  expect(csv).not.toContain("secretUA");
  s.close();
});

test("metrics computes conversion, averages and demo count", () => {
  const s = mem();
  s.insertEvent({ event: "unlock_clicked", target: "https://x.com" });
  s.insertEvent({ event: "unlock_clicked", target: "https://x.com" });
  s.insertEvent({ event: "early_access_submitted", target: "https://x.com" });
  s.insertEvent({ event: "scan_completed", target: "https://x.com", total_findings: 30, locked_findings: 20 });
  s.insertEvent({ event: "scan_completed", target: "https://demo.omyscan.dev", total_findings: 32, locked_findings: 22, is_demo: true });
  const m = s.metrics();
  expect(m.unlock_clicked).toBe(2);
  expect(m.early_access_submitted).toBe(1);
  expect(m.unlock_to_email_conversion).toBe(0.5);
  expect(m.demo_scan_completed).toBe(1);
  expect(m.avg_total_findings).toBe(31);
  expect(m.avg_locked_findings).toBe(21);
  s.close();
});
