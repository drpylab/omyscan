import { emit, hostOf } from "./analytics.js";

export interface EarlyAccessInput {
  email: string;
  target?: string;
  total_findings?: number;
  locked_findings?: number;
}

export interface EarlyAccessRecord {
  email: string;
  target_host?: string;
  total_findings?: number;
  locked_findings?: number;
  timestamp: string;
}

export type EarlyAccessStore = (r: EarlyAccessRecord) => void;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Default store: JSONL line to stdout (dev). Swap for a real provider later. */
const defaultStore: EarlyAccessStore = (r) => {
  process.stdout.write(`[early-access] ${JSON.stringify(r)}\n`);
};

export interface EarlyAccessDeps {
  store?: EarlyAccessStore;
}

export function handleEarlyAccess(
  input: EarlyAccessInput,
  deps: EarlyAccessDeps = {},
): { status: number; body: Record<string, unknown> } {
  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email)) {
    return { status: 400, body: { status: "error", message: "A valid email is required." } };
  }
  const record: EarlyAccessRecord = {
    email: input.email,
    target_host: hostOf(input.target ?? ""),
    total_findings: input.total_findings,
    locked_findings: input.locked_findings,
    timestamp: new Date().toISOString(),
  };
  (deps.store ?? defaultStore)(record);
  // analytics carries NO email — only host + counts.
  emit("early_access_submitted", {
    target_host: record.target_host,
    total_findings: record.total_findings,
    locked_findings: record.locked_findings,
  });
  return { status: 200, body: { status: "ok" } };
}
