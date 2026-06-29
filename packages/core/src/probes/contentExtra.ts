import type { IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";
import { transportVerdict } from "./_transport.js";

// [path, expected content-type token, finding label] — agent-readable content signals.
const PATHS: [string, string, string][] = [
  ["/llms-full.txt", "text/plain", "llms_full_txt"],
  ["/ai.txt", "text/plain", "ai_txt"],
  ["/sitemap.xml", "xml", "sitemap"],
];

export const contentExtraProbe: IProbe = {
  id: "content-extra",
  title: "Agent-readable content signals",
  category: "content-extra",
  mode: "passive",
  async run(ctx: ProbeContext) {
    const signals: Signal[] = [];
    for (const [p, ct, label] of PATHS) {
      const url = `${ctx.origin}${p}`;
      const o = await ctx.fetch(url, ct);
      const tv = transportVerdict(o);
      let verdict: Verdict;
      if (tv !== "ok") verdict = tv;
      else if (o.oversize) verdict = "detected"; // presence (large sitemap/llms-full)
      else if (o.body == null) verdict = "unverified";
      else verdict = o.bytes > 0 ? "detected" : "not-detected";
      if (verdict !== "detected") continue; // §2.1: don't inflate on misses
      signals.push({
        category: "content-extra",
        verdict,
        label,
        evidence: makeEvidence({
          probeId: this.id, url, method: "GET", httpStatus: o.httpStatus, finalUrl: o.finalUrl,
          redirectCount: o.redirectCount, contentTypeExpected: ct, contentTypeActual: o.contentTypeActual,
          contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
        }),
      });
    }
    return { signals };
  },
};
