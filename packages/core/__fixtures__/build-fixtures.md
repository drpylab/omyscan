# Golden fixtures — provenance

Seed = real captures from Sprint 0 passive probe (`docs/sprint0/raw_probe/*.txt`, 2026-06-29).
Each fixture is a JSON map `{ "<urlPathname>": FetchOutcome }`.

- `soft404/` — catch-all SPA sites that return `200 + text/html` on ANY path
  (Cursor, Scalar, Anthropic `.well-known/*`). Expected: every probe → `unverified`, NEVER `detected`. **0 FP gate.**
- `real-manifest/` — genuine `application/json` manifests (LangChain, Nango, Postman). Expected: `detected`.
- `real-llms/` — genuine `text/plain` llms.txt (Stripe, n8n, Perplexity). Expected: `detected`.
- `none/` — no signals (Walmart, Etsy). Expected: `not-detected`.
- `edge/` — 2MB JSON (size cap), 4+ redirects (limit), wrong charset, gzip.

To regenerate, replay `docs/sprint0/probe.sh <url>` and capture the FetchOutcome.
