import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { handleScan } from "./handler.js";
import { handleEarlyAccess } from "./earlyAccess.js";
import { emit, hostOf } from "./analytics.js";

const ALLOWED_EVENTS = new Set(["unlock_clicked"]);

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
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

export function createApiServer() {
  return createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/scan") {
      const raw = await readBody(req);
      let url = "";
      try {
        url = String((JSON.parse(raw) as { url?: unknown }).url ?? "");
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_request", message: "Body must be JSON with a url field." }));
        return;
      }
      const result = await handleScan({ url, ip: clientIp(req) });
      res.writeHead(result.status, { "content-type": "application/json" });
      res.end(JSON.stringify(result.body));
      return;
    }
    if (req.method === "POST" && req.url === "/api/early-access") {
      const raw = await readBody(req);
      let payload: { email?: unknown; target?: unknown; total_findings?: unknown; locked_findings?: unknown };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Invalid JSON." }));
        return;
      }
      const result = handleEarlyAccess({
        email: String(payload.email ?? ""),
        target: typeof payload.target === "string" ? payload.target : undefined,
        total_findings: typeof payload.total_findings === "number" ? payload.total_findings : undefined,
        locked_findings: typeof payload.locked_findings === "number" ? payload.locked_findings : undefined,
      });
      res.writeHead(result.status, { "content-type": "application/json" });
      res.end(JSON.stringify(result.body));
      return;
    }
    if (req.method === "POST" && req.url === "/api/event") {
      const raw = await readBody(req);
      try {
        const p = JSON.parse(raw) as { event?: string; target?: string; total_findings?: number; locked_findings?: number };
        if (typeof p.event === "string" && ALLOWED_EVENTS.has(p.event)) {
          emit(p.event, {
            target_host: typeof p.target === "string" ? hostOf(p.target) : undefined,
            total_findings: typeof p.total_findings === "number" ? p.total_findings : undefined,
            locked_findings: typeof p.locked_findings === "number" ? p.locked_findings : undefined,
          });
        }
      } catch {
        /* ignore malformed beacons */
      }
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
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
