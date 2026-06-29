import { expect, test } from "vitest";
import { assertLexicon } from "@omyscan/core";
import { matchStories, allStories } from "../index.js";

test("story matches when all conditions present", () => {
  const r = matchStories(["openapi_surface_detected", "write_actions_possible", "extra"]);
  expect(r.map((s) => s.story_id)).toContain("agent_discovers_write_actions");
});

test("story does not match when a condition is missing", () => {
  const r = matchStories(["openapi_surface_detected"]);
  expect(r).toHaveLength(0);
});

test("every story text passes the lexicon guard", () => {
  for (const s of allStories()) {
    expect(() => assertLexicon(`${s.title} ${s.text}`)).not.toThrow();
  }
});
