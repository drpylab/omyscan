import { expect, test } from "vitest";
import type { ScanResult } from "@omyscan/core";
import { splitFindings, categoryCounts, applyPreviewPolicy, buildSummary } from "../index.js";

function ev(url: string) {
  return { probeId: "p", url, method: "GET" as const, httpStatus: 200, finalUrl: url, redirectCount: 0, contentTypeExpected: "x", contentTypeActual: "x", contentTypeMatch: true, bytes: 1, fetchedAt: "t" };
}

// A realistic scan with facets (as real probes now emit): llms+entrypoint, gap, openapi+facets, mcp+facets, 9 actions
const result: ScanResult = {
  target: "https://x",
  signals: [
    { category: "discoverability", verdict: "detected", facets: ["ai_readable_entrypoint"], evidence: ev("https://x/llms.txt") },
    { category: "ai-bot-policy", verdict: "not-detected", evidence: ev("https://x/robots.txt") },
    { category: "openapi", verdict: "detected", facets: ["openapi_document", "machine_readable_api", "api_paths", "api_operations"], evidence: ev("https://x/openapi.json") },
    { category: "oauth", verdict: "not-detected", evidence: ev("https://x/.well-known/openid-configuration") },
    { category: "mcp-manifest", verdict: "detected", facets: ["tool_metadata", "agent_callable_surface"], evidence: ev("https://x/.well-known/mcp.json") },
    ...(["read", "write", "update", "delete", "upload", "payment", "send_message", "auth_token", "admin_role"] as const).map(
      (label) => ({ category: "action-surface" as const, verdict: label === "read" || label === "write" || label === "delete" ? ("detected" as const) : ("not-detected" as const), label, evidence: ev("https://x/openapi.json") }),
    ),
  ],
};

test("splitFindings expands detections into atomic findings (main + facets + governance gaps)", () => {
  const f = splitFindings(result);
  // llms(1+1) + gap(1+4) + openapi(1+4) + mcp(1+2) + 9 actions = 24
  expect(f.length).toBe(24);
  expect(f.find((x) => x.id === "openapi_surface_detected")).toBeTruthy();
  expect(f.find((x) => x.id === "openapi__api_paths")?.title).toBe("API paths detected");
  expect(f.find((x) => x.id === "training_pref_missing")?.category).toBe("governance_gap");
});

test("category counts add up", () => {
  const c = categoryCounts(splitFindings(result));
  expect(c.agent_facing_signals).toBe(10); // llms(2) + openapi(5) + mcp(3)
  expect(c.action_surface).toBe(9);
  expect(c.governance_gaps).toBe(5); // gap + 4 missing prefs
});

test("preview split: visible + locked = total, deterministic, interesting first", () => {
  const f = splitFindings(result);
  const split = applyPreviewPolicy(f, 8);
  expect(split.visible.length).toBe(8);
  expect(split.locked.length).toBe(f.length - 8);
  expect(split.visible.length + split.locked.length).toBe(f.length);
  // openapi + gap should be visible (highest priority)
  expect(split.visible.find((x) => x.id === "openapi_surface_detected")).toBeTruthy();
  expect(split.visible.find((x) => x.id === "ai_bot_policy_gap")).toBeTruthy();
  // not-detected actions should be locked (least interesting)
  expect(split.locked.find((x) => x.id === "action_payment")).toBeTruthy();
  // deterministic: same input → same visible ids
  const again = applyPreviewPolicy(splitFindings(result), 8);
  expect(again.visible.map((x) => x.id)).toEqual(split.visible.map((x) => x.id));
});

test("summary reflects detected surfaces", () => {
  const s = buildSummary(applyPreviewPolicy(splitFindings(result), 8));
  expect(s.agent_surface).toBe("detected");
  expect(s.action_surface).toBe("possible");
  expect(s.governance_gap).toBe("detected");
  expect(s.total_findings).toBe(24);
});
