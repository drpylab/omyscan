# omyscan

**Agent-ready is not the same as agent-safe.**

omyscan is an open-source, passive **Agent Surface Mapper**: give it a URL and it
maps what surface a site exposes to AI agents — documentation maps, AI bot policy,
public API/OpenAPI, OAuth discovery metadata, and MCP/agent manifests — then
classifies the discoverable action surface (read / write / delete / upload / …).

It is **not** a web-security scanner. It makes no vulnerability claims and assigns
no score. It reports *agent-facing surface signals* so you can review them before
exposing a surface to autonomous agent workflows.

## What it checks

| Signal | Meaning |
|--------|---------|
| `llms.txt` | machine-readable docs map for agents |
| AI bot policy | whether robots.txt declares rules for AI crawlers (gap = none) |
| OpenAPI / Swagger | public machine-readable API documentation |
| OAuth discovery | machine-readable auth boundary metadata |
| MCP / agent manifest | advertised agent tools / connection endpoints |
| Action surface | read / write / update / delete / upload / payment / send_message / auth_token / admin_role |

## Quick start

```bash
npm install
npx tsx apps/cli/src/main.ts scan https://example.com
```

## CLI usage

```bash
omyscan scan https://example.com          # human-readable Agent Surface Map
omyscan scan https://example.com --json   # full machine-readable result
```

Example:

```
omyscan — Agent Surface Map for https://example.com

Agent-facing signals:
  • [detected] agent-facing surface detected (llms.txt present)  — .../llms.txt (200, text/plain)
  • [not-detected] AI bot policy gap  — .../robots.txt (200, text/plain)
  • [detected] OpenAPI surface detected  — .../openapi.json (200, application/json)

Action surface:
  • read: possible
  • write: possible
  • delete: possible
```

## JSON output

Every signal follows the **Evidence Contract**: `verdict` (`detected` / `not-detected`
/ `unverified`) plus `evidence` (url, http status, content-type expected vs actual,
content-type match, bytes, snippet, timestamp). Output is deterministic.

## Safe scanning policy

omyscan is **passive**. It enforces, on every request:

- **GET/HEAD only** — never POST/PUT/DELETE
- **content-type pinning** — a body is parsed only when its content-type matches
  (a soft-404 / SPA catch-all that returns `200 + text/html` is never a detection)
- **max response size 64 KiB**, **5 s timeout**, **≤3 redirects**
- **allowlisted paths only** — no brute force, no aggressive enumeration

omyscan performs passive checks only. It does not fuzz, exploit, brute-force, bypass
authentication, or claim that a website is vulnerable. Findings are exposure signals
intended for review.

## Hosted scanning safety

The hosted API (`POST /api/scan`) adds an **SSRF guard**: hosted scanning is limited to
public web targets. Internal, private, reserved, link-local and cloud-metadata
addresses are blocked — for the initial URL **and every redirect target**. Only
`http`/`https` schemes are allowed; userinfo (`user:pass@`) is rejected. Requests are
rate-limited per IP. Users cannot supply custom paths, headers, cookies or auth.

```bash
# run the hosted demo (API + one-screen web UI)
npx tsx apps/api/src/server.ts          # → http://localhost:8787
```

## Limitations

- Passive: confirms *presence* of a surface, not its exploitability or runtime behavior.
- Sees only public, server-rendered responses; JS-rendered and auth-walled surfaces are out of scope.
- OpenAPI discovery checks a small allowlist of well-known paths, not arbitrary locations.

## Roadmap

- v0.1.0-alpha — llms.txt, AI bot policy, MCP manifest, CLI
- v0.2.0-alpha — OpenAPI + OAuth discovery + action classification + knowledge-base
- **v0.3.0-alpha — hosted web/API + SSRF guard + free/paid preview model**
- next — $5 Extended report payment, risk-story interpretation

## License

TBD (alpha).
