import type { ScanResult } from "./scanner.js";
import type { Signal } from "./types.js";

export const FORBIDDEN = [
  "vulnerability", "vulnerable", "insecure", "not secure", "security score",
  "/100", "prompt injection detected", "exploit", "hacked", "breach", "cve",
];

export function assertLexicon(s: string): void {
  const low = s.toLowerCase();
  for (const f of FORBIDDEN) {
    if (low.includes(f.toLowerCase())) throw new Error(`lexicon violation: "${f}"`);
  }
}

const PHRASE: Record<string, (s: Signal) => string> = {
  discoverability: (s) =>
    s.verdict === "detected"
      ? "agent-facing surface detected (llms.txt present)"
      : s.verdict === "unverified"
        ? "llms.txt unverified"
        : "no llms.txt agent map",
  "ai-bot-policy": (s) =>
    s.verdict === "detected"
      ? "AI bot policy present"
      : s.verdict === "unverified"
        ? "robots.txt unverified"
        : "AI bot policy gap",
  "mcp-manifest": (s) =>
    s.verdict === "detected"
      ? "agent/MCP manifest detected (possible action surface)"
      : s.verdict === "unverified"
        ? "manifest path unverified (soft-404)"
        : "no agent manifest",
  oauth: (s) =>
    s.verdict === "detected"
      ? "auth boundary metadata detected"
      : s.verdict === "unverified"
        ? "OAuth discovery unverified"
        : "no OAuth discovery",
  openapi: (s) =>
    s.verdict === "detected"
      ? "OpenAPI surface detected"
      : s.verdict === "unverified"
        ? "OpenAPI unverified"
        : "no OpenAPI surface",
};

function actionDisplay(verdict: string): string {
  return verdict === "detected" ? "possible" : verdict === "unverified" ? "unverified" : "not detected";
}

export function formatReport(r: ScanResult): string {
  const lines = [`omyscan — Agent Surface Map for ${r.target}`, "", "Agent-facing signals:"];
  for (const s of r.signals) {
    if (s.category === "action-surface") continue;
    const phrase = PHRASE[s.category]?.(s) ?? s.category;
    lines.push(
      `  • [${s.verdict}] ${phrase}  — ${s.evidence.url} (${s.evidence.httpStatus}, ${s.evidence.contentTypeActual ?? "?"})`,
    );
  }

  const actions = r.signals.filter((s) => s.category === "action-surface");
  if (actions.length > 0) {
    lines.push("", "Action surface:");
    for (const s of actions) {
      lines.push(`  • ${s.label}: ${actionDisplay(s.verdict)}`);
    }
  }

  const out = lines.join("\n");
  assertLexicon(out);
  return out;
}
