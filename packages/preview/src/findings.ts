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

// facet id → atomic finding shape (honest sub-aspects of a detection)
const FACET: Record<string, { title: string; category: FindingCategory; claim: ClaimType }> = {
  ai_readable_entrypoint: { title: "AI-readable documentation entrypoint detected", category: "agent_facing_signal", claim: "exposure_signal" },
  openapi_document: { title: "OpenAPI document detected", category: "agent_facing_signal", claim: "exposure_signal" },
  machine_readable_api: { title: "Machine-readable API surface detected", category: "agent_facing_signal", claim: "exposure_signal" },
  api_paths: { title: "API paths detected", category: "agent_facing_signal", claim: "exposure_signal" },
  api_operations: { title: "API operations detected", category: "agent_facing_signal", claim: "exposure_signal" },
  tool_metadata: { title: "Tool metadata detected", category: "agent_facing_signal", claim: "exposure_signal" },
  agent_callable_surface: { title: "Agent-callable surface metadata detected", category: "agent_facing_signal", claim: "exposure_signal" },
  issuer: { title: "Issuer metadata detected", category: "auth_api_metadata", claim: "auth_metadata" },
  authorization_endpoint: { title: "Authorization endpoint detected", category: "auth_api_metadata", claim: "auth_metadata" },
  token_endpoint: { title: "Token endpoint detected", category: "auth_api_metadata", claim: "auth_metadata" },
  jwks_uri: { title: "JWKS endpoint detected", category: "auth_api_metadata", claim: "auth_metadata" },
  scopes_supported: { title: "Scopes metadata present", category: "auth_api_metadata", claim: "auth_metadata" },
  grant_types_supported: { title: "Grant types metadata present", category: "auth_api_metadata", claim: "auth_metadata" },
  response_types_supported: { title: "Response types metadata present", category: "auth_api_metadata", claim: "auth_metadata" },
};

// governance "absence" findings emitted alongside an AI bot policy gap
const GOVERNANCE_GAPS: { id: string; title: string }[] = [
  { id: "training_pref_missing", title: "Training usage preference not detected" },
  { id: "summarization_pref_missing", title: "Summarization usage preference not detected" },
  { id: "commercial_reuse_pref_missing", title: "Commercial reuse preference not detected" },
  { id: "agent_usage_policy_missing", title: "Agent usage policy not detected" },
];

function fromSignal(s: Signal): Finding[] {
  const base = {
    source_url: s.evidence.url,
    evidence: s.evidence,
    free_visible: false,
    paid_interpretation: "Available in Extended Report.",
    paid_fix: "Available in Extended Report.",
  };
  const out: Finding[] = [];
  const facetFindings = (parentId: string) => {
    for (const fct of s.facets ?? []) {
      const def = FACET[fct];
      if (def == null) continue;
      out.push({ id: `${parentId}__${fct}`, title: def.title, category: def.category, status: "detected", claim_type: def.claim, confidence: "medium", ...base });
    }
  };

  switch (s.category) {
    case "discoverability":
      if (s.verdict === "detected") {
        out.push({ id: "llms_txt_detected", title: "llms.txt detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", confidence: "high", free_text: "An AI-readable documentation map was detected.", ...base });
        facetFindings("llms");
      }
      break;
    case "ai-bot-policy":
      if (s.verdict === "not-detected") {
        out.push({ id: "ai_bot_policy_gap", title: "AI bot policy gap", category: "governance_gap", status: "gap", claim_type: "governance_gap", confidence: "high", free_text: "No AI-specific crawler policy was found in robots.txt.", ...base });
        for (const g of GOVERNANCE_GAPS) {
          out.push({ id: g.id, title: g.title, category: "governance_gap", status: "gap", claim_type: "governance_gap", confidence: "medium", ...base });
        }
      } else if (s.verdict === "detected") {
        out.push({ id: "ai_bot_policy_present", title: "AI bot policy present", category: "policy_signal", status: "detected", claim_type: "policy_signal", confidence: "high", free_text: "An AI-specific crawler policy was found.", ...base });
      }
      break;
    case "openapi":
      if (s.verdict === "detected") {
        out.push({ id: "openapi_surface_detected", title: "OpenAPI surface detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", confidence: "high", free_text: "Public machine-readable API documentation was detected.", ...base });
        facetFindings("openapi");
      }
      break;
    case "oauth":
      if (s.verdict === "detected") {
        out.push({ id: "oauth_discovery_detected", title: "Auth boundary metadata detected", category: "auth_api_metadata", status: "detected", claim_type: "auth_metadata", confidence: "high", free_text: "Machine-readable auth boundary metadata was detected.", ...base });
        facetFindings("oauth");
      }
      break;
    case "mcp-manifest":
      if (s.verdict === "detected") {
        out.push({ id: "mcp_manifest_detected", title: "MCP manifest detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", confidence: "high", free_text: "A machine-readable agent/MCP manifest was detected.", ...base });
        facetFindings("mcp");
      }
      break;
    case "action-surface": {
      const label = s.label ?? "unknown";
      out.push({ id: `action_${label}`, title: ACTION_TITLE[label] ?? `${label} operations`, category: "action_surface", status: s.verdict === "detected" ? "possible" : "not_detected", claim_type: "action_surface", confidence: s.verdict === "detected" ? "medium" : "low", ...base });
      break;
    }
    case "content-extra":
      if (s.verdict === "detected") {
        out.push({ id: `content_${s.label ?? "x"}`, title: CONTENT_TITLE[s.label ?? ""] ?? "Agent-readable content detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", confidence: "medium", ...base });
      }
      break;
    case "docs-area":
      if (s.verdict === "detected") {
        out.push({ id: `docs_${s.label ?? "x"}`, title: DOCS_TITLE[s.label ?? ""] ?? "Documentation area detected", category: "agent_facing_signal", status: "detected", claim_type: "exposure_signal", confidence: "medium", ...base });
      }
      break;
  }
  return out;
}

const CONTENT_TITLE: Record<string, string> = {
  llms_full_txt: "llms-full.txt detected",
  ai_txt: "ai.txt detected",
  sitemap: "Sitemap detected",
};

const DOCS_TITLE: Record<string, string> = {
  docs_area: "Public documentation area detected",
  developer_docs: "Developer documentation area detected",
  api_reference: "API reference area detected",
  swagger_ui: "Swagger/OpenAPI UI path detected",
};

/** Scanner result → atomic findings. Backend always sees the FULL set. */
export function splitFindings(result: ScanResult): Finding[] {
  const out: Finding[] = [];
  for (const s of result.signals) out.push(...fromSignal(s));
  return out;
}
