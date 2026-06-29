import { scan, createFetcher, SsrfBlockedError, assertLexicon, type ScanResult } from "@omyscan/core";
import { guardUrl, type GuardResult, type Resolver } from "@omyscan/safety";
import { splitFindings, applyPreviewPolicy, buildSummary, categoryCounts } from "@omyscan/preview";
import { createRateLimiter, type RateLimiter } from "./rateLimit.js";

const SAFETY_NOTICE = "Passive scan only. GET/HEAD requests. No brute force. No auth bypass.";
const BLOCK_MSG = "This target is not allowed for hosted scanning.";
const MAX_VISIBLE = 10;

export interface ScanInput {
  url: string;
  ip: string;
}
export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}
export interface HandlerDeps {
  limiter?: RateLimiter;
  guard?: (url: string) => Promise<GuardResult>;
  runScan?: (url: string) => Promise<ScanResult>;
  resolver?: Resolver;
}

const sharedLimiter = createRateLimiter();

/** Real scan with SSRF-validated redirects (used in production wiring). */
function defaultRunScan(resolver?: Resolver) {
  return (url: string) =>
    scan(url, {
      fetch: createFetcher({
        validateRedirect: async (u) => {
          const g = await guardUrl(u, resolver);
          if (!g.allowed) throw new SsrfBlockedError(g.reason ?? "blocked");
        },
      }),
    });
}

export async function handleScan(input: ScanInput, deps: HandlerDeps = {}): Promise<HandlerResult> {
  const limiter = deps.limiter ?? sharedLimiter;
  if (!limiter.check(input.ip)) {
    return { status: 429, body: { error: "rate_limited", message: "Too many scan requests. Please try again later." } };
  }

  const guard = deps.guard ?? ((u: string) => guardUrl(u, deps.resolver));
  const g = await guard(input.url);
  if (!g.allowed) {
    return { status: 403, body: { status: "blocked", error: "blocked_by_ssrf_guard", message: BLOCK_MSG, reason: g.reason ?? "blocked" } };
  }

  const runScan = deps.runScan ?? defaultRunScan(deps.resolver);
  let result: ScanResult;
  try {
    result = await runScan(input.url);
  } catch (e) {
    if (e instanceof SsrfBlockedError) {
      return { status: 403, body: { status: "blocked", error: "blocked_by_ssrf_guard", message: BLOCK_MSG, reason: "redirect_to_private_target" } };
    }
    return { status: 502, body: { status: "error", error: "scan_failed", message: "The scan could not be completed." } };
  }

  const findings = splitFindings(result);
  const split = applyPreviewPolicy(findings, MAX_VISIBLE);
  const summary = buildSummary(split);
  const counts = categoryCounts(split.all);
  const lockedCategories = [...new Set(split.locked.map((f) => f.category))];
  const lockedMessage = `${split.locked.length} additional findings and fix recommendations are available in Extended Report.`;
  const ctaLabel = "Unlock all findings + fix plan — $5";

  // Lexicon guard applies to OUR generated copy only (never to site-derived evidence snippets).
  const ourCopy = [ctaLabel, lockedMessage, SAFETY_NOTICE, ...split.visible.map((f) => `${f.title} ${f.free_text ?? ""}`)].join(" ");
  assertLexicon(ourCopy);

  return {
    status: 200,
    body: {
      target: result.target,
      status: "completed",
      summary,
      category_counts: counts,
      visible_findings: split.visible,
      locked_preview: { count: split.locked.length, categories: lockedCategories, message: lockedMessage },
      cta: { label: ctaLabel, enabled: false },
      safety_notice: SAFETY_NOTICE,
    },
  };
}
