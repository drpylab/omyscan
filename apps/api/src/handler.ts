import { scan, createFetcher, SsrfBlockedError, type ScanResult } from "@omyscan/core";
import { guardUrl, type GuardResult, type Resolver } from "@omyscan/safety";
import { createRateLimiter, type RateLimiter } from "./rateLimit.js";
import { emit, hostOf } from "./analytics.js";
import { buildScanResponse } from "./response.js";

const BLOCK_MSG = "This target is not allowed for hosted scanning.";

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
  const host = hostOf(input.url);
  emit("scan_started", { target_host: host });

  const limiter = deps.limiter ?? sharedLimiter;
  if (!limiter.check(input.ip)) {
    emit("scan_rate_limited", { target_host: host });
    return { status: 429, body: { error: "rate_limited", message: "Too many scan requests. Please try again later." } };
  }

  const guard = deps.guard ?? ((u: string) => guardUrl(u, deps.resolver));
  const g = await guard(input.url);
  if (!g.allowed) {
    emit("scan_blocked_by_ssrf", { target_host: host });
    return { status: 403, body: { status: "blocked", error: "blocked_by_ssrf_guard", message: BLOCK_MSG, reason: g.reason ?? "blocked" } };
  }

  const runScan = deps.runScan ?? defaultRunScan(deps.resolver);
  let result: ScanResult;
  try {
    result = await runScan(input.url);
  } catch (e) {
    if (e instanceof SsrfBlockedError) {
      emit("scan_blocked_by_ssrf", { target_host: host });
      return { status: 403, body: { status: "blocked", error: "blocked_by_ssrf_guard", message: BLOCK_MSG, reason: "redirect_to_private_target" } };
    }
    emit("scan_failed", { target_host: host });
    return { status: 502, body: { status: "error", error: "scan_failed", message: "The scan could not be completed." } };
  }

  const body = buildScanResponse(result);
  const summary = body.summary as { total_findings: number; visible_findings: number; locked_findings: number };
  emit("scan_completed", {
    target_host: host,
    total_findings: summary.total_findings,
    visible_findings: summary.visible_findings,
    locked_findings: summary.locked_findings,
  });

  return { status: 200, body };
}
