import type { Storage } from "./storage.js";

/** Constant-time-ish token check. Missing configured token → always deny (safe default). */
function authorized(token: string | null, adminToken: string | undefined): boolean {
  return typeof adminToken === "string" && adminToken.length > 0 && token === adminToken;
}

export function handleMetrics(
  token: string | null,
  storage: Storage,
  adminToken = process.env.OMYSCAN_ADMIN_TOKEN,
): { status: number; body: Record<string, unknown> } {
  if (!authorized(token, adminToken)) return { status: 403, body: { error: "forbidden" } };
  return { status: 200, body: storage.metrics() as unknown as Record<string, unknown> };
}

export function handleLeadsCsv(
  token: string | null,
  storage: Storage,
  adminToken = process.env.OMYSCAN_ADMIN_TOKEN,
): { status: number; contentType: string; body: string } {
  if (!authorized(token, adminToken)) {
    return { status: 403, contentType: "application/json", body: JSON.stringify({ error: "forbidden" }) };
  }
  return { status: 200, contentType: "text/csv; charset=utf-8", body: storage.leadsCsv() };
}
