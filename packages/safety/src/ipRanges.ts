import { isIP } from "node:net";

/** IPv4 CIDR blocklist: loopback, private, CGNAT, link-local, multicast, reserved. */
const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
];

/** IPv6 CIDR blocklist: unspecified, loopback, ULA, link-local, multicast. */
const V6_BLOCKS: [string, number][] = [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
];

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const o = Number(p);
    if (o > 255) return null;
    n = n * 256 + o;
  }
  return n >>> 0;
}

function inV4Cidr(ipInt: number, base: string, prefix: number): boolean {
  const baseInt = v4ToInt(base)!;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/** Expand any valid IPv6 (with :: and optional embedded IPv4) to a BigInt. */
function v6ToBigInt(ip: string): bigint | null {
  let s = ip;
  // embedded IPv4 tail → convert to two hextets
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const v4 = v4ToInt(m[2]!);
    if (v4 == null) return null;
    const hi = (v4 >>> 16) & 0xffff;
    const lo = v4 & 0xffff;
    s = `${m[1]}${hi.toString(16)}:${lo.toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - (head.length + tail.length);
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.length !== 8) return null;
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    n = (n << 16n) + BigInt(parseInt(g, 16));
  }
  return n;
}

function inV6Cidr(ipBig: bigint, base: string, prefix: number): boolean {
  const baseBig = v6ToBigInt(base)!;
  const mask = prefix === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - prefix)) - 1n);
  return (ipBig & mask) === (baseBig & mask);
}

/**
 * True if an IP literal is loopback / private / link-local / metadata /
 * multicast / reserved — i.e. NOT a safe public scan target.
 * Invalid input fails closed (blocked).
 */
export function isBlockedIp(ip: string): boolean {
  const ver = isIP(ip);
  if (ver === 4) {
    const n = v4ToInt(ip);
    if (n == null) return true;
    return V4_BLOCKS.some(([b, p]) => inV4Cidr(n, b, p));
  }
  if (ver === 6) {
    const n = v6ToBigInt(ip);
    if (n == null) return true;
    // v4-mapped ::ffff:a.b.c.d → also enforce the v4 blocklist on the embedded address
    const mappedPrefix = 0xffffn << 32n;
    if ((n >> 32n) === mappedPrefix >> 32n && (n >> 48n) === 0n) {
      const v4 = Number(n & 0xffffffffn) >>> 0;
      if (V4_BLOCKS.some(([b, p]) => inV4Cidr(v4, b, p))) return true;
    }
    return V6_BLOCKS.some(([b, p]) => inV6Cidr(n, b, p));
  }
  return true; // not a valid IP → fail closed
}
