import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { handleScan } from "./handler.js";
import { handleEarlyAccess } from "./earlyAccess.js";
import { buildDemoResponse } from "./demo.js";
import { createStorage, type Storage } from "./storage.js";
import { handleMetrics, handleLeadsCsv } from "./admin.js";

const ALLOWED_EVENTS = new Set(["unlock_clicked"]);
const DEMO_TARGET = "https://demo.omyscan.dev";

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}
function userAgent(req: IncomingMessage): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}
function tokenOf(url: string): string | null {
  const i = url.indexOf("?");
  if (i < 0) return null;
  return new URLSearchParams(url.slice(i + 1)).get("token");
}

async function readBody(req: IncomingMessage, limit = 4096): Promise<string> {
  let raw = "";
  for await (const c of req) {
    raw += c;
    if (raw.length > limit) break;
  }
  return raw;
}

let webHtml: string | null = null;
function indexHtml(): string {
  if (webHtml == null) {
    try {
      webHtml = readFileSync(fileURLToPath(new URL("../../web/public/index.html", import.meta.url)), "utf8");
    } catch {
      webHtml = "<!doctype html><title>omyscan</title><p>omyscan API is running. POST /api/scan</p>";
    }
  }
  return webHtml;
}

export function createApiServer(storage: Storage = createStorage()) {
  return createServer(async (req, res) => {
    const path = (req.url ?? "").split("?")[0];
    const ip = clientIp(req);
    const ua = userAgent(req);

    if (req.method === "POST" && path === "/api/scan") {
      const raw = await readBody(req);
      let url = "";
      try {
        url = String((JSON.parse(raw) as { url?: unknown }).url ?? "");
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_request", message: "Body must be JSON with a url field." }));
        return;
      }
      storage.insertEvent({ event: "scan_started", target: url, ip, user_agent: ua });
      const result = await handleScan({ url, ip });
      if (result.body.status === "completed") {
        const s = result.body.summary as { total_findings: number; visible_findings: number; locked_findings: number };
        storage.insertEvent({ event: "scan_completed", target: url, total_findings: s.total_findings, visible_findings: s.visible_findings, locked_findings: s.locked_findings, is_demo: false, ip, user_agent: ua });
      } else if (result.body.error === "blocked_by_ssrf_guard") {
        storage.insertEvent({ event: "scan_blocked_by_ssrf", target: url, ip, user_agent: ua });
      } else if (result.body.error === "rate_limited") {
        storage.insertEvent({ event: "scan_rate_limited", target: url, ip, user_agent: ua });
      } else {
        storage.insertEvent({ event: "scan_failed", target: url, ip, user_agent: ua });
      }
      res.writeHead(result.status, { "content-type": "application/json" });
      res.end(JSON.stringify(result.body));
      return;
    }

    if (req.method === "GET" && path === "/api/demo-scan") {
      storage.insertEvent({ event: "scan_started", target: DEMO_TARGET, is_demo: true, ip, user_agent: ua });
      const body = buildDemoResponse();
      const s = body.summary as { total_findings: number; visible_findings: number; locked_findings: number };
      storage.insertEvent({ event: "scan_completed", target: DEMO_TARGET, total_findings: s.total_findings, visible_findings: s.visible_findings, locked_findings: s.locked_findings, is_demo: true, ip, user_agent: ua });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }

    if (req.method === "POST" && path === "/api/early-access") {
      const raw = await readBody(req);
      let p: { email?: unknown; target?: unknown; total_findings?: unknown; visible_findings?: unknown; locked_findings?: unknown; is_demo?: unknown };
      try {
        p = JSON.parse(raw) as typeof p;
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Invalid JSON." }));
        return;
      }
      const result = handleEarlyAccess(
        {
          email: String(p.email ?? ""),
          target: typeof p.target === "string" ? p.target : undefined,
          total_findings: typeof p.total_findings === "number" ? p.total_findings : undefined,
          visible_findings: typeof p.visible_findings === "number" ? p.visible_findings : undefined,
          locked_findings: typeof p.locked_findings === "number" ? p.locked_findings : undefined,
          is_demo: typeof p.is_demo === "boolean" ? p.is_demo : undefined,
          ip, user_agent: ua,
        },
        { storage },
      );
      res.writeHead(result.status, { "content-type": "application/json" });
      res.end(JSON.stringify(result.body));
      return;
    }

    if (req.method === "POST" && path === "/api/event") {
      const raw = await readBody(req);
      try {
        const p = JSON.parse(raw) as { event?: string; target?: string; total_findings?: number; locked_findings?: number };
        if (typeof p.event === "string" && ALLOWED_EVENTS.has(p.event)) {
          storage.insertEvent({
            event: p.event,
            target: typeof p.target === "string" ? p.target : undefined,
            total_findings: typeof p.total_findings === "number" ? p.total_findings : undefined,
            locked_findings: typeof p.locked_findings === "number" ? p.locked_findings : undefined,
            ip, user_agent: ua,
          });
        }
      } catch {
        /* ignore malformed beacons */
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "GET" && path === "/api/metrics") {
      const r = handleMetrics(tokenOf(req.url ?? ""), storage);
      res.writeHead(r.status, { "content-type": "application/json" });
      res.end(JSON.stringify(r.body));
      return;
    }

    if (req.method === "GET" && path === "/api/leads.csv") {
      const r = handleLeadsCsv(tokenOf(req.url ?? ""), storage);
      res.writeHead(r.status, { "content-type": r.contentType });
      res.end(r.body);
      return;
    }

    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(indexHtml());
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8787);
  createApiServer().listen(port, () => {
    process.stdout.write(`omyscan api + web on http://localhost:${port}\n`);
  });
}
