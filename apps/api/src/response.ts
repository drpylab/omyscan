import { assertLexicon, type ScanResult } from "@omyscan/core";
import { splitFindings, applyPreviewPolicy, buildSummary, categoryCounts } from "@omyscan/preview";
import { matchStories } from "@omyscan/knowledge-base";

export const SAFETY_NOTICE = "Passive scan only. GET/HEAD requests. No brute force. No auth bypass.";
export const CTA_LABEL = "Show all findings and how to fix — $5";
const MAX_VISIBLE = 10;
const LOW_SURFACE_MAX = 5;

/** Tokens used to match risk stories: detected/gap finding ids + `<label>_actions_possible`. */
function activeTokens(findings: { id: string; category: string; status: string }[]): string[] {
  const t = new Set<string>();
  for (const f of findings) {
    if (f.status === "detected" || f.status === "gap") t.add(f.id);
    if (f.category === "action_surface" && f.status === "possible") {
      t.add(`${f.id.replace(/^action_/, "")}_actions_possible`);
    }
  }
  return [...t];
}

export interface BuildOpts {
  is_demo?: boolean;
}

/** Assemble the public scan response from a raw ScanResult (shared by real + demo scans). */
export function buildScanResponse(result: ScanResult, opts: BuildOpts = {}): Record<string, unknown> {
  const findings = splitFindings(result);
  const split = applyPreviewPolicy(findings, MAX_VISIBLE);
  const summary = buildSummary(split);
  const counts = categoryCounts(split.all);
  const lockedCategories = [...new Set(split.locked.map((f) => f.category))];
  const lockedMessage = `${split.locked.length} additional findings and fix recommendations are available in Extended Report.`;
  const stories = matchStories(activeTokens(split.all)).map((s) => ({ story_id: s.story_id, title: s.title }));

  // Lexicon guard over OUR generated copy only (never over site-derived evidence snippets).
  const ourCopy = [
    CTA_LABEL, lockedMessage, SAFETY_NOTICE,
    ...split.visible.map((f) => `${f.title} ${f.free_text ?? ""}`),
    ...stories.map((s) => s.title),
  ].join(" ");
  assertLexicon(ourCopy);

  return {
    target: result.target,
    status: "completed",
    is_demo: opts.is_demo ?? false,
    low_surface: summary.total_findings <= LOW_SURFACE_MAX,
    summary,
    category_counts: counts,
    visible_findings: split.visible,
    risk_stories: stories,
    locked_preview: { count: split.locked.length, categories: lockedCategories, message: lockedMessage },
    cta: { label: CTA_LABEL, enabled: false },
    safety_notice: SAFETY_NOTICE,
  };
}
