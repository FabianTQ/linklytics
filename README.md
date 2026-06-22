# Linklytics

> Self-hostable **URL shortener with click analytics** — a production-shaped,
> $0-to-run full-stack platform. Next.js + NestJS, PostgreSQL + Redis,
> containerized with Docker, orchestrated on **local Kubernetes (kind)**, with a
> CI/CD pipeline that smoke-tests the whole deployment end-to-end.

> **Status:** under active construction (built in phases). See
> [the build phases](#build-phases). The full README — architecture diagram,
> copy-paste run instructions, and the infrastructure tradeoffs writeup — lands
> in the docs phase.

## What it does

- Create short links and share them; public redirects live at `/r/:slug`.
- Per-link analytics: clicks over time, top referrers, and geo by IP.
- Cookie-based auth (httpOnly JWT), owner-scoped links, Redis-backed caching and
  rate limiting.

## Tech stack

| Layer         | Choice                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| Web           | Next.js 15 (App Router), TypeScript (strict), Tailwind, shadcn/ui          |
| API           | NestJS, TypeScript (strict), Prisma, class-validator, Zod env validation   |
| Data          | PostgreSQL 16, Redis 7                                                     |
| Container     | Multi-stage Docker images, non-root, slim runtime                          |
| Orchestration | Kubernetes via Kustomize (base + local/prod overlays), `kind` for local    |
| CI/CD         | GitHub Actions — lint, typecheck, tests, Docker build, **kind smoke test** |

## Design decision: redirects at `/r/:slug`

The public redirect endpoint lives at `/r/:slug` so it never collides with the
dashboard at `/`. In a real deployment the redirect would sit on a separate
short domain (e.g. `lnk.example`); the tradeoff is documented in
[ARCHITECTURE.md](ARCHITECTURE.md) and expanded in the docs phase.

## Build phases

1. ✅ Scaffold monorepo + tooling (pnpm, ESLint, Prettier, strict tsconfig).
2. ⬜ API: NestJS + Prisma + Auth + Links + Redirect + Health + Redis.
3. ⬜ Web: Next.js auth UI + dashboard + analytics.
4. ⬜ Docker: multi-stage images + docker-compose dev.
5. ⬜ Kubernetes: Kustomize base + local/prod overlays + kind.
6. ⬜ CI: lint/typecheck/tests + Docker build + kind smoke test.
7. ⬜ CD: build & push images to GHCR + documented prod deploy.
8. ⬜ Docs: full README + ARCHITECTURE + Mermaid + tradeoffs.

## License

[MIT](LICENSE).
