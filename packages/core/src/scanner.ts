import { createFetcher } from "./fetcher.js";
import type { FetchFn, IProbe, ProbeContext, Signal } from "./types.js";
import { llmsTxtProbe } from "./probes/llmsTxt.js";
import { aiBotPolicyProbe } from "./probes/aiBotPolicy.js";
import { mcpManifestProbe } from "./probes/mcpManifest.js";

export const DEFAULT_PROBES: IProbe[] = [llmsTxtProbe, aiBotPolicyProbe, mcpManifestProbe];

export interface ScanResult {
  target: string;
  signals: Signal[];
}

export interface ScanOpts {
  probes?: IProbe[];
  fetch?: FetchFn;
}

export async function scan(targetUrl: string, opts: ScanOpts = {}): Promise<ScanResult> {
  const u = new URL(targetUrl);
  const origin = u.origin;
  const ctx: ProbeContext = {
    origin,
    baseUrl: `${origin}${u.pathname}`.replace(/\/$/, ""),
    fetch: opts.fetch ?? createFetcher(),
  };
  const probes = opts.probes ?? DEFAULT_PROBES;
  const signals: Signal[] = [];
  for (const p of probes) {
    const r = await p.run(ctx);
    signals.push(...r.signals);
  }
  return { target: origin, signals };
}
