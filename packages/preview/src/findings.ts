import type { Evidence, ScanResult, Signal } from "@omyscan/core";

export type FindingCategory =
  | "agent_facing_signal"
  | "action_surface"
  | "governance_gap"
  | "auth_api_metadata"
  | "policy_signal"
  | "transport_signal";

export type FindingStatus = "detected" | "not_detected" | "possible" | "gap" | "unverified";

export type ClaimType =
  | "exposure_signal"
  | "governance_gap"
  | "action_surface"
  | "auth_metadata"
  | "policy_signal";

export interface Finding {
  id: string;
  title: string;
  category: FindingCategory;
  status: FindingStatus;
  source_url?: string;
  evidence?: Evidence;
  confidence: "high" | "medium" | "low";
  claim_type: ClaimType;
  free_visible: boolean;
  locked_reason?: string;
  free_text?: string;
  paid_interpretation?: string;
  paid_fix?: string;
}

const ACTION_TITLE: Record<string, string> = {
  read: "Read-like operations possible",
  write: "Write-like operations possible",
  update: "Update-like operations possible",
  delete: "Delete-like operations possible",
  upload: "Upload-like operations possible",
  payment: "Payment-like operations possible",
  send_message: "Message-sending operations possible",
  auth_token: "Auth/token operations possible",
  admin_role: "Admin/role operations possible",
};

function fromSignal(s: Signal): Finding | null {
  const base = {
    confidence: (s.verdict === "detected" ? "high" : s.verdict === "unverified" ? "low" : "medium") as Finding["confidence"],
    source_url: s.evidence.url,
    evidence: s.evidence,
    free_visible: false,
    paid_interpretation: "Available in Extended Report.",
    paid_fix: "Available in Extended Report.",
  };
  switch (s.category) {
    case "discoverability":
      return s.verdict === "detected"
        ? { id: "llms_txt_detected", title: "llms.txt detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", free_text: "An AI-readable documentation map was detected.", ...base }
        : null;
    case "ai-bot-policy":
      return s.verdict === "not-detected"
        ? { id: "ai_bot_policy_gap", title: "AI bot policy gap", category: "governance_gap", status: "gap", claim_type: "governance_gap", free_text: "No AI-specific crawler policy was found in robots.txt.", ...base }
        : s.verdict === "detected"
          ? { id: "ai_bot_policy_present", title: "AI bot policy present", category: "policy_signal", status: "detected", claim_type: "policy_signal", free_text: "An AI-specific crawler policy was found.", ...base }
          : null;
    case "openapi":
      return s.verdict === "detected"
        ? { id: "openapi_surface_detected", title: "OpenAPI surface detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", free_text: "Public machine-readable API documentation was detected.", ...base }
        : null;
    case "oauth":
      return s.verdict === "detected"
        ? { id: "oauth_discovery_detected", title: "Auth boundary metadata detected", category: "auth_api_metadata", status: "detected", claim_type: "auth_metadata", free_text: "Machine-readable auth boundary metadata was detected.", ...base }
        : null;
    case "mcp-manifest":
      return s.verdict === "detected"
        ? { id: "mcp_manifest_detected", title: "MCP manifest detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", free_text: "A machine-readable agent/MCP manifest was detected.", ...base }
        : null;
    case "action-surface": {
      const label = s.label ?? "unknown";
      return {
        id: `action_${label}`,
        title: ACTION_TITLE[label] ?? `${label} operations`,
        category: "action_surface",
        status: s.verdict === "detected" ? "possible" : "not_detected",
        claim_type: "action_surface",
        ...base,
      };
    }
    default:
      return null;
  }
}

/** Scanner result → atomic findings. Backend always sees the FULL set. */
export function splitFindings(result: ScanResult): Finding[] {
  const out: Finding[] = [];
  for (const s of result.signals) {
    const f = fromSignal(s);
    if (f != null) out.push(f);
  }
  return out;
}
