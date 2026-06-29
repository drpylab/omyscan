import type { ActionClass } from "./types.js";

/**
 * Classify an API operation into an action class from its HTTP method + a text
 * hint (path / operationId / summary). Keyword overrides take precedence over
 * the method default. Passive, deterministic, no network.
 */
export function classifyAction(method: string, hint: string): ActionClass {
  const m = method.toLowerCase();
  const h = hint.toLowerCase();

  // keyword overrides (most specific first)
  if (/\b(pay|payment|charge|checkout|order|invoice|refund)\b/.test(h)) return "payment";
  if (/\b(message|email|sms|notify|send)\b/.test(h)) return "send_message";
  if (/\b(upload|file|attachment|import|ingest)\b/.test(h)) return "upload";
  if (/\b(token|oauth|login|auth|session|apikey)\b/.test(h)) return "auth_token";
  if (/\b(role|admin|permission|grant|privilege)\b/.test(h)) return "admin_role";

  switch (m) {
    case "get":
    case "head":
      return "read";
    case "post":
      return "write";
    case "put":
    case "patch":
      return "update";
    case "delete":
      return "delete";
    default:
      return "unknown";
  }
}
