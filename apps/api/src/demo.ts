import type { Evidence, ScanResult, Signal } from "@omyscan/core";
import { buildScanResponse } from "./response.js";

const T = "https://demo.omyscan.dev";

function ev(path: string, ct = "application/json"): Evidence {
  return {
    probeId: "demo", url: `${T}${path}`, method: "GET", httpStatus: 200, finalUrl: `${T}${path}`,
    redirectCount: 0, contentTypeExpected: ct, contentTypeActual: ct, contentTypeMatch: true,
    bytes: 1024, fetchedAt: "2026-01-01T00:00:00.000Z",
  };
}

// A deterministic, agent-heavy synthetic result run through the SAME pipeline as
// real scans — so the demo always shows a rich, honest-shaped preview.
const DEMO_RESULT: ScanResult = {
  target: T,
  signals: [
    { category: "discoverability", verdict: "detected", facets: ["ai_readable_entrypoint"], evidence: ev("/llms.txt", "text/plain") },
    { category: "ai-bot-policy", verdict: "not-detected", evidence: ev("/robots.txt", "text/plain") },
    { category: "openapi", verdict: "detected", facets: ["openapi_document", "machine_readable_api", "api_paths", "api_operations"], evidence: ev("/openapi.json") },
    {
      category: "oauth", verdict: "detected", evidence: ev("/.well-known/openid-configuration"),
      facets: ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri", "scopes_supported", "grant_types_supported", "response_types_supported"],
    },
    { category: "mcp-manifest", verdict: "detected", facets: ["tool_metadata", "agent_callable_surface"], evidence: ev("/.well-known/mcp.json") },
    ...(["read", "write", "update", "delete", "upload", "payment", "send_message", "auth_token", "admin_role"] as const).map(
      (label): Signal => ({
        category: "action-surface",
        verdict: label === "admin_role" ? "not-detected" : "detected", // most actions possible
        label,
        evidence: ev("/openapi.json"),
      }),
    ),
  ],
};

export function buildDemoResponse(): Record<string, unknown> {
  return buildScanResponse(DEMO_RESULT, { is_demo: true });
}
