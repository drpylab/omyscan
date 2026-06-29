export interface PolicyResult {
  ok: boolean;
  reason?: string;
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

/**
 * Scheme + shape policy for a hosted scan target.
 * Allows only http/https, rejects userinfo (user:pass@), rejects unparseable URLs.
 * Does NOT resolve DNS — that is the SSRF guard's job.
 */
export function checkUrlPolicy(raw: string): PolicyResult {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!ALLOWED_SCHEMES.has(u.protocol)) return { ok: false, reason: "scheme_not_allowed" };
  if (u.username !== "" || u.password !== "") return { ok: false, reason: "userinfo_not_allowed" };
  if (u.hostname === "") return { ok: false, reason: "invalid_url" };
  return { ok: true };
}
