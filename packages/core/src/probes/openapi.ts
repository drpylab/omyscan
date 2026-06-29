import { parse as parseYaml } from "yaml";
import type { ActionClass, Evidence, IProbe, ProbeContext, Signal, Verdict } from "../types.js";
import { makeEvidence } from "../types.js";
import { classifyAction } from "../actions.js";
import { transportVerdict } from "./_transport.js";

const PATHS = [
  "/openapi.json", "/openapi.yaml", "/swagger.json", "/swagger.yaml",
  "/api/openapi.json", "/api/swagger.json", "/.well-known/openapi.json", "/docs/openapi.json",
];

const ALL_ACTIONS: ActionClass[] = [
  "read", "write", "update", "delete", "upload",
  "payment", "send_message", "auth_token", "admin_role",
];

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head"];

function expectedType(path: string): string {
  return path.endsWith(".yaml") || path.endsWith(".yml") ? "yaml" : "application/json";
}

function extractActions(spec: unknown): Set<ActionClass> {
  const found = new Set<ActionClass>();
  const paths = (spec as { paths?: Record<string, unknown> })?.paths;
  if (paths == null || typeof paths !== "object") return found;
  for (const [apiPath, ops] of Object.entries(paths)) {
    if (ops == null || typeof ops !== "object") continue;
    for (const [method, op] of Object.entries(ops as Record<string, unknown>)) {
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue;
      const o = (op ?? {}) as { operationId?: string; summary?: string; tags?: string[] };
      const hint = `${apiPath} ${o.operationId ?? ""} ${o.summary ?? ""} ${(o.tags ?? []).join(" ")}`;
      found.add(classifyAction(method, hint));
    }
  }
  found.delete("unknown");
  return found;
}

export const openapiProbe: IProbe = {
  id: "openapi",
  title: "OpenAPI / Swagger surface",
  category: "openapi",
  mode: "passive",
  async run(ctx: ProbeContext) {
    let best: Verdict = "not-detected";
    let bestEvidence: Evidence | null = null;
    let firstEvidence: Evidence | null = null;
    const actions = new Set<ActionClass>();
    let pathCount = 0;
    let parsed = false;

    for (const p of PATHS) {
      const url = `${ctx.origin}${p}`;
      const exp = expectedType(p);
      const o = await ctx.fetch(url, exp);
      const ev = makeEvidence({
        probeId: this.id, url, method: "GET", httpStatus: o.httpStatus, finalUrl: o.finalUrl,
        redirectCount: o.redirectCount, contentTypeExpected: exp, contentTypeActual: o.contentTypeActual,
        contentTypeMatch: o.contentTypeMatch, bytes: o.bytes,
        ...(o.body != null ? { snippet: o.body.slice(0, 200) } : {}),
      });
      firstEvidence ??= ev;

      const tv = transportVerdict(o);
      let verdict: Verdict;
      if (tv !== "ok") {
        verdict = tv;
      } else if (o.oversize) {
        verdict = "detected"; // presence only, not parsed
      } else if (o.body == null) {
        verdict = "unverified";
      } else {
        const spec = tryParse(o.body, exp);
        if (spec == null) {
          verdict = "unverified";
        } else {
          verdict = "detected";
          parsed = true;
          const paths = (spec as { paths?: Record<string, unknown> })?.paths;
          if (paths != null && typeof paths === "object") pathCount += Object.keys(paths).length;
          for (const a of extractActions(spec)) actions.add(a);
        }
      }
      if (rank(verdict) > rank(best)) {
        best = verdict;
        bestEvidence = ev;
      }
    }

    const evidence = bestEvidence ?? firstEvidence!;
    const facets: string[] = [];
    if (best === "detected") {
      facets.push("openapi_document", "machine_readable_api");
      if (parsed && pathCount > 0) facets.push("api_paths");
      if (parsed && actions.size > 0) facets.push("api_operations");
    }
    const openapiSignal: Signal = { category: "openapi", verdict: best, evidence };
    if (facets.length > 0) openapiSignal.facets = facets;
    const signals: Signal[] = [openapiSignal];
    for (const a of ALL_ACTIONS) {
      signals.push({
        category: "action-surface",
        verdict: actions.has(a) ? "detected" : "not-detected",
        label: a,
        evidence,
      });
    }
    return { signals };
  },
};

function rank(v: Verdict): number {
  return v === "detected" ? 2 : v === "unverified" ? 1 : 0;
}

function tryParse(body: string, exp: string): unknown {
  try {
    return exp === "yaml" ? parseYaml(body) : JSON.parse(body);
  } catch {
    return null;
  }
}
