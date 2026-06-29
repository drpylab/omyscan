import type { IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";
import { transportVerdict } from "./_transport.js";

export const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai",
  "CCBot", "Google-Extended", "PerplexityBot", "Bytespider", "Applebot-Extended",
  "cohere-ai", "Amazonbot", "Meta-ExternalAgent", "Diffbot", "AI2Bot",
] as const;

export const aiBotPolicyProbe: IProbe = {
  id: "ai-bot-policy",
  title: "AI bot policy in robots.txt",
  category: "ai-bot-policy",
  mode: "passive",
  async run(ctx: ProbeContext) {
    const url = `${ctx.origin}/robots.txt`;
    const o = await ctx.fetch(url, "text/plain");
    const tv = transportVerdict(o);
    let verdict: Verdict;
    if (tv === "unverified" || (tv === "ok" && o.body == null)) {
      verdict = "unverified";
    } else if (tv === "not-detected") {
      // no robots.txt at all → no AI policy declared → the GAP
      verdict = "not-detected";
    } else {
      const low = o.body!.toLowerCase();
      verdict = AI_BOTS.some((b) => low.includes(b.toLowerCase())) ? "detected" : "not-detected";
    }
    const sig: Signal = {
      category: "ai-bot-policy",
      verdict,
      evidence: makeEvidence({
        probeId: this.id, url, method: "GET", httpStatus: o.httpStatus,
        finalUrl: o.finalUrl, redirectCount: o.redirectCount, contentTypeExpected: "text/plain",
        contentTypeActual: o.contentTypeActual, contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
      }),
    };
    return { signals: [sig] };
  },
};
