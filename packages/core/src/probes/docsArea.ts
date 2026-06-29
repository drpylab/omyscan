import type { IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";

// [path, finding label] — public documentation areas (HTML pages).
const DOCS: [string, string][] = [
  ["/docs", "docs_area"],
  ["/reference", "docs_area"],
  ["/developers", "developer_docs"],
  ["/developer", "developer_docs"],
  ["/api", "api_reference"],
  ["/api-docs", "api_reference"],
  ["/swagger", "swagger_ui"],
  ["/swagger-ui", "swagger_ui"],
  ["/openapi", "swagger_ui"],
];

export const docsAreaProbe: IProbe = {
  id: "docs-area",
  title: "Documentation exposure signals",
  category: "docs-area",
  mode: "passive",
  async run(ctx: ProbeContext) {
    // Soft-404 baseline: if a random path returns 2xx, the site is a catch-all
    // and HTML 200s prove nothing → detect NOTHING (FP=0).
    const baseline = await ctx.fetch(`${ctx.origin}/__omyscan_nonexistent_a9z3q`, "text/html");
    const catchAll = baseline.httpStatus >= 200 && baseline.httpStatus < 300;

    const matched = new Map<string, string>(); // label → first matching url
    if (!catchAll) {
      for (const [p, label] of DOCS) {
        if (matched.has(label)) continue;
        const url = `${ctx.origin}${p}`;
        const o = await ctx.fetch(url, "text/html");
        const ok2xx = o.httpStatus >= 200 && o.httpStatus < 300;
        if (ok2xx && o.contentTypeMatch) matched.set(label, url);
      }
    }

    const signals: Signal[] = [];
    for (const [label, url] of matched) {
      const verdict: Verdict = "detected";
      signals.push({
        category: "docs-area",
        verdict,
        label,
        evidence: makeEvidence({
          probeId: this.id, url, method: "GET", httpStatus: 200, finalUrl: url, redirectCount: 0,
          contentTypeExpected: "text/html", contentTypeActual: "text/html", contentTypeMatch: true, bytes: 0,
        }),
      });
    }
    return { signals };
  },
};
