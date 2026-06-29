# omyscan v0.3.0-alpha — Hosted Web/API + SSRF Guard

## Highlights

- Hosted scan API (`POST /api/scan`)
- One-screen web UI
- SSRF guard
- Rate limiting
- Free/locked preview model
- $5 Extended Report CTA placeholder
- Atomic findings
- Category counts
- Preserved passive scan invariants

## Safety

- GET/HEAD only
- allowlisted paths only
- no fuzzing
- no exploitation
- SSRF guarded (initial URL + every redirect)
- no vulnerability claims

## Validation

- 112/112 tests passing
- SSRF guard covered by 45 tests
- build passing

---

> v0.3.1-alpha adds launch-readiness polish: early-access modal, minimal
> host-only analytics, premium web UI, SAFETY.md / SECURITY.md, example outputs, CI.
