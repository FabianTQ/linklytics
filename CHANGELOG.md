# Changelog

## [0.3.0](https://github.com/FabianTQ/linklytics/compare/v0.2.0...v0.3.0) (2026-06-23)


### Features

* **api:** sliding-window rate limit + daily analytics rollup ([454e32a](https://github.com/FabianTQ/linklytics/commit/454e32a32057f8b969198d2b15ef5c1154968ef8))
* **auth:** short-lived access token + rotating refresh tokens ([512ea6e](https://github.com/FabianTQ/linklytics/commit/512ea6ecdd7a352714e5f63f30863dfda74206b9))
* branded slugs, link expiry/active, pagination, search, QR codes ([27d7e5f](https://github.com/FabianTQ/linklytics/commit/27d7e5fbadbb98d72f6bc22511ed1e3e8687cc8b))
* k8s metrics scraping, /metrics auth, structured logging ([4afaa9c](https://github.com/FabianTQ/linklytics/commit/4afaa9c4709acd5b21619d9452dede7d5359a5c4))


### Bug Fixes

* **docker:** install pnpm via npm instead of corepack ([d3250e4](https://github.com/FabianTQ/linklytics/commit/d3250e43508c7feb3d5f6b25931b30b0ca25009c))

## [0.2.0](https://github.com/FabianTQ/linklytics/compare/v0.1.0...v0.2.0) (2026-06-23)

### Features

- **api:** NestJS API with auth, links, redirect, analytics and health ([6b7830f](https://github.com/FabianTQ/linklytics/commit/6b7830f338937026967918b44ab53e020fbfed1d))
- **api:** Prometheus /metrics endpoint with request + domain metrics ([486bd44](https://github.com/FabianTQ/linklytics/commit/486bd4456929cb0555406686816e7567feef95b7))
- **compose:** multi-stage Docker images and docker-compose stack ([b592a94](https://github.com/FabianTQ/linklytics/commit/b592a94391a636ed535cb5170dc3fc14a1be3546))
- **k8s:** Kustomize manifests + kind deploy, verified end-to-end ([d3661c2](https://github.com/FabianTQ/linklytics/commit/d3661c233c377940ebf6c8cb5702b9d97fa93ab0))
- **observability:** Prometheus + Grafana stack, extra e2e, screenshots ([0f1dd57](https://github.com/FabianTQ/linklytics/commit/0f1dd57706ed8760fe375395a0d77544bf3a0a72))
- **web:** Next.js 15 dashboard with auth and per-link analytics ([779e9a2](https://github.com/FabianTQ/linklytics/commit/779e9a2cf695252d92695c33067565888e1c2113))

### Bug Fixes

- **api:** make db:seed work on Windows shells ([5f9837c](https://github.com/FabianTQ/linklytics/commit/5f9837c7343721831c2a6609f4e0f89009a0a3e1))
- **ci:** retry kustomize apply for ingress-nginx admission webhook race ([c81ffbe](https://github.com/FabianTQ/linklytics/commit/c81ffbea4f9459d4609afc443d6bec3677af2100))
- **ci:** wait for ingress to route api before the smoke flow ([47266d8](https://github.com/FabianTQ/linklytics/commit/47266d820b129a6c91b11ff3106efce09867c167))
- **web:** render the analytics clicks-over-time bars ([f0f75f7](https://github.com/FabianTQ/linklytics/commit/f0f75f7f66850e9eff052e1e4daed1f7599a649b))
