import type { Evidence, IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";
import { transportVerdict } from "./_transport.js";

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
    let best: Verdict = "not-detected";
    let bestEvidence: Evidence | null = null;
    let firstEvidence: Evidence | null = null;

    for (const p of PATHS) {
      const url = `${ctx.origin}${p}`;
      const o = await ctx.fetch(url, "application/json");
      const ev = makeEvidence({
        probeId: this.id, url, method: "GET", httpStatus: o.httpStatus,
        finalUrl: o.finalUrl, redirectCount: o.redirectCount, contentTypeExpected: "application/json",
        contentTypeActual: o.contentTypeActual, contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
        ...(o.body != null ? { snippet: o.body.slice(0, 200) } : {}),
      });
      firstEvidence ??= ev;

      const tv = transportVerdict(o);
      let verdict: Verdict;
      if (tv !== "ok") verdict = tv;
      else if (o.body != null && o.bytes > 40 && o.bytes < 40000 && isJson(o.body)) verdict = "detected";
      else verdict = "not-detected";

      if (rank(verdict) > rank(best)) {
        best = verdict;
        bestEvidence = ev;
      }
    }
    const sig: Signal = { category: "mcp-manifest", verdict: best, evidence: bestEvidence ?? firstEvidence! };
    return { signals: [sig] };
  },
};

function rank(v: Verdict): number {
  return v === "detected" ? 2 : v === "unverified" ? 1 : 0;
}

function isJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}
