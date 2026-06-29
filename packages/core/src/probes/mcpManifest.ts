import type { IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";

const PATHS = [
  "/.well-known/mcp.json",
  "/.well-known/agent.json",
  "/.well-known/agent-card.json",
  "/.well-known/ai-plugin.json",
];

export const mcpManifestProbe: IProbe = {
  id: "mcp-manifest",
  title: "MCP / agent manifest",
  category: "mcp-manifest",
  mode: "passive",
  async run(ctx: ProbeContext) {
    const signals: Signal[] = [];
    for (const p of PATHS) {
      const url = `${ctx.origin}${p}`;
      const o = await ctx.fetch(url, "application/json");
      let verdict: Verdict = "not-detected";
      if (!o.contentTypeMatch || o.body == null) verdict = "unverified";
      else if (o.bytes > 40 && o.bytes < 40000 && isJson(o.body)) verdict = "detected";
      signals.push({
        category: "mcp-manifest",
        verdict,
        evidence: makeEvidence({
          probeId: this.id, url, method: "GET", httpStatus: o.httpStatus,
          finalUrl: o.finalUrl, redirectCount: o.redirectCount, contentTypeExpected: "application/json",
          contentTypeActual: o.contentTypeActual, contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
          ...(o.body != null ? { snippet: o.body.slice(0, 200) } : {}),
        }),
      });
    }
    return { signals };
  },
};

function isJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}
