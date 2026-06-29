# Security Policy

If you find a security issue in omyscan, please report it responsibly.

**Do not use public GitHub issues for sensitive reports.**

Please include:

- affected version
- reproduction steps
- expected behavior
- actual behavior
- impact

## Reporting channel

For now, please open a private disclosure channel or contact the maintainers
through the repository owner profile. A dedicated security contact email will be
published with the first public (non-alpha) release.

## Scope

omyscan is a passive scanner (see [SAFETY.md](./SAFETY.md)). Reports of interest
include: SSRF guard bypasses, ways to make the hosted scanner reach private/reserved
targets, redirect-handling gaps, response-size or timeout bypasses, and any path by
which user-facing output could emit forbidden vulnerability/score wording.
