# Contributing

## Commit convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<optional scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`, `perf`.

Examples:

```
feat(api): add slug collision-safe generator
fix(web): copy-to-clipboard fallback on insecure origins
ci: run kind smoke test on pull requests
```

Scopes used in this monorepo: `api`, `web`, `k8s`, `compose`, `ci`, `cd`, `repo`.

## Workflow

1. Branch off `main`.
2. Keep every phase green: `pnpm lint && pnpm typecheck && pnpm test`.
3. Open a PR — CI (lint, typecheck, API tests, web e2e, Docker build, kind smoke test) must pass.

## Local toolchain

- Node `>=20` (see `.nvmrc`), `pnpm` (via Corepack), Docker Desktop with the WSL2 backend.
- `kind` + `kubectl` for the Kubernetes demo (`pnpm run k8s:up`).
