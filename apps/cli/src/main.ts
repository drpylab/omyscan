import { scan, formatReport, type ScanResult, type FetchFn, type FetchOutcome } from "@omyscan/core";

const SPEC = JSON.stringify({
  openapi: "3.0.0",
  paths: {
    "/users": { get: { summary: "list users" }, post: { summary: "create user" } },
    "/users/{id}": { delete: { summary: "remove user" } },
  },
});

const miss: FetchOutcome = {
  url: "u", finalUrl: "u", httpStatus: 404, redirectCount: 0,
  contentTypeActual: "text/html", contentTypeMatch: false, bytes: 0, body: null, oversize: false,
};

// URL-aware mock so `--selftest` produces a realistic demo Surface Map offline.
const selftestFetch: FetchFn = async (url, expected) => {
  const ok = (body: string, ct: string): FetchOutcome => ({
    url, finalUrl: url, httpStatus: 200, redirectCount: 0,
    contentTypeActual: ct, contentTypeMatch: ct.includes(expected), bytes: body.length, body, oversize: false,
  });
  if (url.endsWith("/llms.txt")) return ok("# Docs\n" + "x".repeat(300), "text/plain");
  if (url.endsWith("/robots.txt")) return ok("User-agent: *\nDisallow:", "text/plain");
  if (url.endsWith("/openapi.json")) return ok(SPEC, "application/json");
  return miss;
};

export async function runCli(argv: string[]): Promise<{ code: number; stdout: string }> {
  const [cmd, url, ...flags] = argv;
  if (cmd !== "scan" || !url) {
    return { code: 2, stdout: "usage: omyscan scan <url> [--json]" };
  }
  const selftest = flags.includes("--selftest");
  const opts = selftest ? { fetch: selftestFetch } : {};
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
