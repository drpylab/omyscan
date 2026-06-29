import type { Evidence, IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";

const PATHS = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-protected-resource",
];

const META_KEYS = [
  "issuer", "authorization_endpoint", "token_endpoint", "jwks_uri",
  "scopes_supported", "grant_types_supported", "response_types_supported",
];

export const oauthProbe: IProbe = {
  id: "oauth",
  title: "OAuth / OpenID discovery",
  category: "oauth",
  mode: "passive",
  async run(ctx: ProbeContext) {
    let best: Verdict = "not-detected";
    let bestEvidence: Evidence | null = null;
    let firstEvidence: Evidence | null = null;

    for (const p of PATHS) {
      const url = `${ctx.origin}${p}`;
      const o = await ctx.fetch(url, "application/json");
      const ok2xx = o.httpStatus >= 200 && o.httpStatus < 300;
      const ev = makeEvidence({
        probeId: this.id, url, method: "GET", httpStatus: o.httpStatus, finalUrl: o.finalUrl,
        redirectCount: o.redirectCount, contentTypeExpected: "application/json",
        contentTypeActual: o.contentTypeActual, contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
        ...(o.body != null ? { snippet: o.body.slice(0, 200) } : {}),
      });
      firstEvidence ??= ev;

      let verdict: Verdict;
      if (!o.contentTypeMatch || !ok2xx || o.body == null) {
        verdict = "unverified";
      } else {
        const meta = tryParse(o.body);
        if (meta == null) verdict = "unverified";
        else verdict = hasAnyKey(meta) ? "detected" : "not-detected";
      }
      if (rank(verdict) > rank(best)) {
        best = verdict;
        bestEvidence = ev;
      }
    }

    const sig: Signal = { category: "oauth", verdict: best, evidence: bestEvidence ?? firstEvidence! };
    return { signals: [sig] };
  },
};

function hasAnyKey(meta: unknown): boolean {
  if (meta == null || typeof meta !== "object") return false;
  const obj = meta as Record<string, unknown>;
  return META_KEYS.some((k) => k in obj);
}

function rank(v: Verdict): number {
  return v === "detected" ? 2 : v === "unverified" ? 1 : 0;
}

function tryParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
