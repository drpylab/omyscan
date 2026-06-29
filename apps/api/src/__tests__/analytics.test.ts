import { afterEach, expect, test } from "vitest";
import { emit, hostOf, setSink, type AnalyticsEvent } from "../analytics.js";

afterEach(() => setSink((e) => process.stdout.write(JSON.stringify(e) + "\n")));

test("hostOf returns hostname only — never path or query", () => {
  expect(hostOf("https://docs.langchain.com/guide?token=secret&x=1")).toBe("docs.langchain.com");
  expect(hostOf("http://example.com:8080/a/b")).toBe("example.com");
  expect(hostOf("not a url")).toBeUndefined();
});

test("emit attaches event name + ISO timestamp and never leaks full URL", () => {
  const seen: AnalyticsEvent[] = [];
  setSink((e) => seen.push(e));
  emit("scan_started", { target_host: "x.com" });
  expect(seen[0]!.event).toBe("scan_started");
  expect(seen[0]!.target_host).toBe("x.com");
  expect(typeof seen[0]!.timestamp).toBe("string");
  // no field should contain a path/query
  expect(JSON.stringify(seen[0])).not.toContain("?");
  expect(JSON.stringify(seen[0])).not.toContain("/guide");
});
