import { isIP } from "node:net";
import { isBlockedIp } from "./ipRanges.js";
import { checkUrlPolicy } from "./urlPolicy.js";

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  ips?: string[];
}

/** Resolve a hostname to its IP addresses (A/AAAA). Injectable for tests. */
export type Resolver = (hostname: string) => Promise<string[]>;

const BLOCK_MSG = "This target is not allowed for hosted scanning.";

const defaultResolver: Resolver = async (hostname) => {
  const { lookup } = await import("node:dns/promises");
  const res = await lookup(hostname, { all: true });
  return res.map((r) => r.address);
};

function block(reason: string): GuardResult {
  return { allowed: false, reason, message: BLOCK_MSG };
}

/**
 * SSRF guard for hosted scanning. Validates scheme/userinfo, then resolves the
 * hostname and rejects if the literal IP OR any resolved IP is private /
 * reserved / loopback / link-local / metadata. Apply to the initial URL AND to
 * every redirect target.
 */
export async function guardUrl(raw: string, resolver: Resolver = defaultResolver): Promise<GuardResult> {
  const pol = checkUrlPolicy(raw);
  if (!pol.ok) return block(pol.reason ?? "blocked");

  let host = new URL(raw).hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (host === "localhost" || host.endsWith(".localhost")) {
    return block("private_or_reserved_target");
  }

  if (isIP(host) !== 0) {
    return isBlockedIp(host)
      ? block("private_or_reserved_target")
      : { allowed: true, ips: [host] };
  }

  let ips: string[];
  try {
    ips = await resolver(host);
  } catch {
    return block("dns_resolution_failed");
  }
  if (ips.length === 0) return block("dns_resolution_failed");
  if (ips.some(isBlockedIp)) return block("private_or_reserved_target");
  return { allowed: true, ips };
}

/** A redirect target gets the exact same guard as an initial URL. */
export const guardRedirect = guardUrl;
