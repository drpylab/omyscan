export interface AnalyticsEvent {
  event: string;
  target_host?: string | undefined;
  total_findings?: number | undefined;
  visible_findings?: number | undefined;
  locked_findings?: number | undefined;
  timestamp: string;
}

export type Sink = (e: AnalyticsEvent) => void;

let sink: Sink = (e) => process.stdout.write(JSON.stringify(e) + "\n");

/** Replace the analytics sink (e.g. for tests or a real provider later). */
export function setSink(s: Sink): void {
  sink = s;
}

/** Hostname only — never the path or query string (no PII / secrets in analytics). */
export function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function emit(
  event: string,
  fields: Partial<Omit<AnalyticsEvent, "event" | "timestamp">> = {},
): AnalyticsEvent {
  const e: AnalyticsEvent = { event, timestamp: new Date().toISOString(), ...fields };
  sink(e);
  return e;
}
