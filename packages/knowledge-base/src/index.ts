import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Interpretation {
  signal_id: string;
  free_interpretation: string;
  extended_interpretation: string;
  safe_language: string[];
  forbidden_language: string[];
}

function loadDir<T>(relDir: string): T[] {
  const dir = fileURLToPath(new URL(relDir, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort() // deterministic order
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as T);
}

const INTERPRETATIONS: Interpretation[] = loadDir<Interpretation>("../interpretations/");
const BY_ID = new Map(INTERPRETATIONS.map((i) => [i.signal_id, i]));

export function getInterpretation(signalId: string): Interpretation | null {
  return BY_ID.get(signalId) ?? null;
}

export function allInterpretations(): Interpretation[] {
  return [...INTERPRETATIONS];
}
