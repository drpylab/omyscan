import type { Storage } from "./storage.js";

export interface EarlyAccessInput {
  email: string;
  target?: string | undefined;
  total_findings?: number | undefined;
  visible_findings?: number | undefined;
  locked_findings?: number | undefined;
  is_demo?: boolean | undefined;
  ip?: string | undefined;
  user_agent?: string | undefined;
}

export interface EarlyAccessDeps {
  storage: Storage;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function handleEarlyAccess(
  input: EarlyAccessInput,
  deps: EarlyAccessDeps,
): { status: number; body: Record<string, unknown> } {
  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email.trim())) {
    return { status: 400, body: { status: "error", message: "A valid email is required." } };
  }
  const email = input.email.trim().toLowerCase();
  const common = {
    target: input.target,
    total_findings: input.total_findings,
    visible_findings: input.visible_findings,
    locked_findings: input.locked_findings,
    is_demo: input.is_demo,
    ip: input.ip,
    user_agent: input.user_agent,
  };
  deps.storage.insertLead({ email, ...common });
  // analytics carries NO email — only host + counts (hashed ip/ua handled by storage).
  deps.storage.insertEvent({ event: "early_access_submitted", ...common });
  return { status: 200, body: { status: "ok" } };
}
