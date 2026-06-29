import type { IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";

export const llmsTxtProbe: IProbe = {
  id: "llms-txt",
  title: "llms.txt agent docs map",
  category: "discoverability",
  mode: "passive",
  async run(ctx: ProbeContext) {
    const url = `${ctx.origin}/llms.txt`;
    const o = await ctx.fetch(url, "text/plain");
    let verdict: Verdict;
    if (!o.contentTypeMatch || o.body == null) verdict = "unverified";
    else if (o.body.length > 200) verdict = "detected";
    else verdict = "not-detected";
    const sig: Signal = {
      category: "discoverability",
      verdict,
      evidence: makeEvidence({
        probeId: this.id, url, method: "GET", httpStatus: o.httpStatus,
        finalUrl: o.finalUrl, redirectCount: o.redirectCount, contentTypeExpected: "text/plain",
        contentTypeActual: o.contentTypeActual, contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
        ...(o.body != null ? { snippet: o.body.slice(0, 200) } : {}),
      }),
    };
    return { signals: [sig] };
  },
};
