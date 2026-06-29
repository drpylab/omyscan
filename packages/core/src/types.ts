export type Verdict = "detected" | "not-detected" | "unverified";

export type ProbeCategory =
  | "discoverability"
  | "ai-bot-policy"
  | "mcp-manifest"
  | "oauth"
  | "openapi";

export interface Evidence {
  probeId: string;
  url: string;
  method: "GET" | "HEAD";
  httpStatus: number;
  finalUrl: string;
  redirectCount: number;
  contentTypeExpected: string;
  contentTypeActual: string | null;
  contentTypeMatch: boolean;
  bytes: number;
  snippet?: string;
  fetchedAt: string;
}

export interface Signal {
  category: ProbeCategory;
  verdict: Verdict;
  evidence: Evidence;
  interpretationKey?: string;
}

export interface ProbeResult {
  signals: Signal[];
}

export interface FetchOutcome {
  url: string;
  finalUrl: string;
  httpStatus: number;
  redirectCount: number;
  contentTypeActual: string | null;
  contentTypeMatch: boolean;
  bytes: number;
  body: string | null; // null when pinning failed / over size / non-2xx
  oversize: boolean;
}

export type FetchFn = (
  url: string,
  expectedContentType: string,
  method?: "GET" | "HEAD",
) => Promise<FetchOutcome>;

export interface ProbeContext {
  origin: string;
  baseUrl: string;
  fetch: FetchFn;
}

export interface IProbe {
  id: string;
  title: string;
  category: ProbeCategory;
  mode: "passive";
  run(ctx: ProbeContext): Promise<ProbeResult>;
}

export function makeEvidence(
  e: Omit<Evidence, "fetchedAt"> & { fetchedAt?: string },
): Evidence {
  return { ...e, fetchedAt: e.fetchedAt ?? new Date().toISOString() };
}
