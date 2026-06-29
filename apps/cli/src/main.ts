import { scan, formatReport, type ScanResult, type FetchOutcome } from "@omyscan/core";

const SELFTEST_OUTCOME: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 200, redirectCount: 0,
  contentTypeActual: "text/plain", contentTypeMatch: true, bytes: 400,
  body: "# Docs\n" + "x".repeat(300), oversize: false,
};

export async function runCli(argv: string[]): Promise<{ code: number; stdout: string }> {
  const [cmd, url, ...flags] = argv;
  if (cmd !== "scan" || !url) {
    return { code: 2, stdout: "usage: aiscanner scan <url> [--json]" };
  }
  const selftest = flags.includes("--selftest");
  const opts = selftest ? { fetch: async () => SELFTEST_OUTCOME } : {};
  const result: ScanResult = await scan(url, opts);
  const stdout = flags.includes("--json") ? JSON.stringify(result, null, 2) : formatReport(result);
  return { code: 0, stdout };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((r) => {
    process.stdout.write(r.stdout + "\n");
    process.exit(r.code);
  });
}
