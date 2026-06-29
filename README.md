# omyscan

**See your product through an AI agent's eyes.**

omyscan maps what AI agents can read, discover and attempt to use:
llms.txt, AI bot policies, MCP manifests, OpenAPI/OAuth metadata and action surfaces.

Passive. Evidence-based. No vulnerability claims.

---

## What it detects

- llms.txt
- AI bot policy gaps
- MCP manifests
- OpenAPI discovery
- OAuth discovery
- action surface classification (read / write / update / delete / upload / payment / send_message / auth_token / admin_role)
- governance / policy signals

## Hosted demo

Public hosted demo URL: coming soon.

## Local hosted demo

```bash
npm install
npx tsx apps/api/src/server.ts        # → http://localhost:8787
```

Open the URL, paste a public product URL, and get a one-screen Agent Surface Map
with a free preview and a locked-findings Extended Report CTA.

## CLI usage

```bash
omyscan scan https://example.com          # human-readable Agent Surface Map
omyscan scan https://example.com --json   # full machine-readable result
```

## Safety model

omyscan performs passive checks only:

- GET/HEAD only
- allowlisted paths only
- no fuzzing
- no exploitation
- no authentication bypass
- no crawling
- SSRF guarded in hosted mode

See [SAFETY.md](./SAFETY.md) for the full model.

## Example output

```
omyscan — Agent Surface Map for https://docs.langchain.com

Agent-facing signals:
  • [detected] agent-facing surface detected (llms.txt present)  — .../llms.txt (200, text/plain)
  • [not-detected] AI bot policy gap  — .../robots.txt (200, text/plain)
  • [detected] agent/MCP manifest detected (possible action surface)  — .../.well-known/mcp.json (200, application/json)
```

Full machine-readable samples: [`examples/`](./examples) — including a free preview
response and an SSRF-blocked response. Every signal follows the **Evidence Contract**
(`verdict` + `evidence`: url, status, content-type expected vs actual, bytes, snippet).

## Free vs Extended report

**Free preview:**
- total findings count
- top visible findings
- category summary
- locked findings count

**Extended Report:**
- all findings
- full evidence
- risk stories
- prioritized fix plan
- copy-paste recommendations

## Development

```bash
npm install
npm test          # 112 tests
npm run build     # typecheck all packages
```

Monorepo: `packages/core` (scanner + probes), `packages/safety` (SSRF guard),
`packages/preview` (findings + free/locked split), `packages/knowledge-base`
(interpretations + risk stories), `apps/cli`, `apps/api`, `apps/web`.

## Roadmap

- v0.1.0-alpha — llms.txt, AI bot policy, MCP manifest, CLI
- v0.2.0-alpha — OpenAPI + OAuth discovery + action classification + knowledge-base
- v0.3.0-alpha — hosted web/API + SSRF guard + free/paid preview model
- **v0.3.1-alpha — launch-readiness polish (early-access modal, analytics, docs)**
- next — $5 Extended report payment, risk-story interpretation

## License

TBD (alpha).
