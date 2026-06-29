# Safety Model

omyscan is a passive agent-facing surface scanner.

It does not:

- exploit
- fuzz
- brute-force
- bypass authentication
- crawl arbitrary paths
- test hidden endpoints
- claim that a target is vulnerable

## Transport invariants (every request)

- GET/HEAD only
- content-type pinning (a body is parsed only when its content-type matches; a
  soft-404 / SPA catch-all returning `200 + text/html` is never a detection)
- max response size 64 KiB
- 5 second timeout
- ≤ 3 redirects
- allowlisted paths only — no aggressive enumeration

## Hosted mode blocks

- localhost
- private IP ranges
- link-local addresses
- cloud metadata addresses (e.g. 169.254.169.254)
- reserved / multicast ranges
- unsafe schemes (file, ftp, gopher, data, javascript, …)
- userinfo in URLs (`user:pass@…`)
- redirects to any blocked target

The SSRF guard resolves the hostname and rejects if the literal IP or **any**
resolved IP is private/reserved — for the initial URL and every redirect target.
Users cannot supply custom paths, headers, cookies or authentication.

Findings are **exposure signals intended for review** — not vulnerability claims
and not a security score.
