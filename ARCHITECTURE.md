# Architecture

> This document grows with the project. The full architecture diagram (Mermaid),
> data model, request flows, and the infrastructure tradeoffs writeup land in the
> docs phase. This stub records the load-bearing decisions as they are made.

## Decision log

### ADR-001 — Public redirect at `/r/:slug`

**Context.** The dashboard SPA owns `/`. The public redirect must not shadow
dashboard routes or static assets.

**Decision.** Serve redirects at `/r/:slug`. The ingress routes `/` → web,
`/api` → api, and `/r` → api.

**Tradeoff.** In production a URL shortener uses a short, separate apex domain
(`https://lnk.example/abc123`) for branding and to isolate the redirect hot path
from the app. Running everything on one host locally keeps the demo to `$0` and a
single ingress; the prod overlay documents the separate-domain path.

### ADR-002 — `bcryptjs` over native `bcrypt`

Pure-JS hashing (cost 12) avoids a node-gyp/native toolchain on both Windows dev
machines and Alpine runtime images. Same algorithm and work factor; marginally
slower hashing, which is irrelevant at login volumes.

### ADR-003 — Offline geo via `geoip-lite`

IP→country/city resolution uses the bundled `geoip-lite` database: no API key, no
network call on the hot path, `$0`. Accuracy is coarser than a paid MaxMind feed;
acceptable for analytics aggregates.
