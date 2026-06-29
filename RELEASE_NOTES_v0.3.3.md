# omyscan v0.3.3-alpha — Demo Scan + Expanded Surface Findings

## Highlights
- Demo scan: `GET /api/demo-scan` returns a deterministic, agent-heavy result
  (32 findings, 10 shown, 22 locked, 5 risk stories) — always shows product value.
- "Try demo scan" in the web UI + a clear "Demo result" badge.
- Expanded atomic findings via honest facets (OpenAPI document/paths/operations,
  OAuth issuer/token/jwks/scopes/grants, MCP tool metadata, governance preference gaps).
  Real scans got richer too (e.g. LangChain 12→19 findings, 2→9 locked).
- Agent Action Risk Stories: combination interpretations (write actions, ingestion,
  tool surface, auth+API boundaries, high doc surface). Free shows titles only.
- Low-surface hint: low-signal real scans suggest the demo instead of feeling empty.

## Safety (unchanged)
- GET/HEAD only · allowlisted paths only · no crawling · no POST/PUT/DELETE
- SSRF guarded (initial URL + every redirect) · no vulnerability claims · no score

## Validation
- 115/115 tests passing · SSRF guard 45 tests · build passing · CLI unchanged
