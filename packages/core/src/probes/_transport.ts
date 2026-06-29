import type { FetchOutcome, Verdict } from "../types.js";

/**
 * Transport-level verdict shared by all probes:
 *  - non-2xx (genuine 404/error)      → "not-detected" (resource absent)
 *  - 2xx but content-type mismatch    → "unverified"   (soft-404 / SPA catch-all)
 *  - 2xx + content-type match         → "ok" (caller proceeds to parse/inspect)
 * Keeps FP=0: a soft-404 (200 + wrong type) can never become "detected".
 */
export function transportVerdict(o: FetchOutcome): Verdict | "ok" {
  const ok2xx = o.httpStatus >= 200 && o.httpStatus < 300;
  if (!ok2xx) return "not-detected";
  if (!o.contentTypeMatch) return "unverified";
  return "ok";
}
