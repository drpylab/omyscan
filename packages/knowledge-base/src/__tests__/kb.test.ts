import { expect, test } from "vitest";
import { assertLexicon } from "@omyscan/core";
import { getInterpretation, allInterpretations } from "../index.js";

test("loads interpretations by signal_id", () => {
  expect(getInterpretation("openapi_surface_detected")?.free_interpretation).toContain("API");
  expect(getInterpretation("oauth_discovery_detected")?.free_interpretation).toContain("auth boundary");
  expect(getInterpretation("nope")).toBeNull();
});

test("every interpretation's copy passes the core lexicon guard", () => {
  for (const i of allInterpretations()) {
    expect(() => assertLexicon(`${i.free_interpretation} ${i.extended_interpretation}`)).not.toThrow();
  }
});

test("all five signal families present", () => {
  const ids = allInterpretations().map((i) => i.signal_id).sort();
  expect(ids).toEqual([
    "ai_bot_policy_gap",
    "llms_txt_detected",
    "mcp_manifest_detected",
    "oauth_discovery_detected",
    "openapi_surface_detected",
  ]);
});
