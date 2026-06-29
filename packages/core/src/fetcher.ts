import { request } from "undici";
import type { FetchFn, FetchOutcome } from "./types.js";

const MAX_BYTES = 65536;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/** Thrown when a redirect target is rejected by an injected SSRF guard. */
export class SsrfBlockedError extends Error {
  constructor(public reason: string) {
    super("blocked_by_ssrf_guard");
    this.name = "SsrfBlockedError";
  }
}

export interface FetcherOptions {
  /** Validate each redirect target before following it; throw to block. */
  validateRedirect?: (url: string) => Promise<void>;
}

/**
 * SafeFetcher — enforces every transport invariant:
 *  GET/HEAD only · content-type pinning · 64 KiB cap · 5s timeout · ≤3 redirects.
 * Redirects are followed manually so finalUrl / redirectCount are exact, we
 * re-apply the size cap on the final body, and (in hosted mode) every redirect
 * target is SSRF-validated before being followed.
 */
export function createFetcher(opts: FetcherOptions = {}): FetchFn {
  return async (url, expectedContentType, method = "GET"): Promise<FetchOutcome> => {
    let current = url;
    let redirectCount = 0;

    for (;;) {
      const res = await request(current, {
        method,
        maxRedirections: 0,
        headersTimeout: TIMEOUT_MS,
        bodyTimeout: TIMEOUT_MS,
        headers: {
          accept: expectedContentType,
          "user-agent": "AIscanner/0.1 (+passive surface map)",
        },
      });

      // Swallow abort errors emitted when we destroy the body early
      // (redirect skip / oversize cut-off) so they never leak as unhandled.
      res.body.on("error", () => {});

      const status = res.statusCode;
      const location = res.headers["location"] as string | undefined;
      const isRedirect = status >= 300 && status < 400 && location != null;

      if (isRedirect && redirectCount < MAX_REDIRECTS) {
        res.body.destroy();
        const next = new URL(location, current).toString();
        if (opts.validateRedirect) await opts.validateRedirect(next); // throws to block
        current = next;
        redirectCount += 1;
        continue;
      }

      const ct = (res.headers["content-type"] as string | undefined) ?? null;
      const match =
        ct != null && ct.toLowerCase().includes(expectedContentType.toLowerCase());
      const ok = status >= 200 && status < 300;

      let bytes = 0;
      const chunks: Buffer[] = [];
      let oversize = false;
      for await (const c of res.body) {
        const buf = c as Buffer;
        bytes += buf.length;
        if (bytes > MAX_BYTES) {
          oversize = true;
          res.body.destroy();
          break;
        }
        chunks.push(buf);
      }

      const body = ok && match && !oversize ? Buffer.concat(chunks).toString("utf8") : null;
      return {
        url,
        finalUrl: current,
        httpStatus: status,
        redirectCount,
        contentTypeActual: ct,
        contentTypeMatch: match,
        bytes,
        body,
        oversize,
      };
    }
  };
}
