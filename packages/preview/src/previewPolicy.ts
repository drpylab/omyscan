import type { Finding } from "./findings.js";

export interface CategoryCounts {
  agent_facing_signals: number;
  action_surface: number;
  governance_gaps: number;
  auth_api_metadata: number;
  policy_signals: number;
}

export function categoryCounts(findings: Finding[]): CategoryCounts {
  const c: CategoryCounts = {
    agent_facing_signals: 0, action_surface: 0, governance_gaps: 0,
    auth_api_metadata: 0, policy_signals: 0,
  };
  for (const f of findings) {
    if (f.category === "agent_facing_signal") c.agent_facing_signals++;
    else if (f.category === "action_surface") c.action_surface++;
    else if (f.category === "governance_gap") c.governance_gaps++;
    else if (f.category === "auth_api_metadata") c.auth_api_metadata++;
    else if (f.category === "policy_signal") c.policy_signals++;
  }
  return c;
}

// Most understandable / decision-relevant findings first.
const PRIORITY = [
  "openapi_surface_detected", "ai_bot_policy_gap", "action_write", "action_upload",
  "action_delete", "action_payment", "action_send_message", "action_auth_token",
  "oauth_discovery_detected", "mcp_manifest_detected", "llms_txt_detected",
  "action_read", "action_update", "action_admin_role", "ai_bot_policy_present",
];

function statusWeight(f: Finding): number {
  if (f.status === "detected" || f.status === "gap" || f.status === "possible") return 0;
  if (f.status === "unverified") return 1;
  return 2; // not_detected — least interesting
}

function rank(id: string): number {
  const i = PRIORITY.indexOf(id);
  return i === -1 ? 999 : i;
}

export interface PreviewSplit {
  all: Finding[];
  visible: Finding[];
  locked: Finding[];
}

/**
 * Deterministically choose the top `maxVisible` findings to show for free.
 * The scan itself is never trimmed — only the *visibility* of results.
 */
export function applyPreviewPolicy(findings: Finding[], maxVisible = 10): PreviewSplit {
  const ordered = [...findings].sort((a, b) => {
    const w = statusWeight(a) - statusWeight(b);
    if (w !== 0) return w;
    const r = rank(a.id) - rank(b.id);
    if (r !== 0) return r;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const all = ordered.map((f, i) => {
    const free_visible = i < maxVisible;
    return free_visible
      ? { ...f, free_visible: true }
      : { ...f, free_visible: false, locked_reason: "extended_report" };
  });
  return { all, visible: all.filter((f) => f.free_visible), locked: all.filter((f) => !f.free_visible) };
}

export interface Summary {
  total_findings: number;
  visible_findings: number;
  locked_findings: number;
  agent_surface: "detected" | "not_detected";
  action_surface: "possible" | "not_detected";
  governance_gap: "detected" | "not_detected";
}

export function buildSummary(split: PreviewSplit): Summary {
  const all = split.all;
  return {
    total_findings: all.length,
    visible_findings: split.visible.length,
    locked_findings: split.locked.length,
    agent_surface: all.some((f) => f.category === "agent_facing_signal" && f.status === "detected") ? "detected" : "not_detected",
    action_surface: all.some((f) => f.category === "action_surface" && f.status === "possible") ? "possible" : "not_detected",
    governance_gap: all.some((f) => f.category === "governance_gap" && f.status === "gap") ? "detected" : "not_detected",
  };
}
