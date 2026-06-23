# Linklytics — developer task runner.
# Windows users without `make`: equivalent pnpm scripts exist (see README) —
# e.g. `pnpm compose:up`, `pnpm compose:down`, `pnpm test`.

COMPOSE := docker compose -f deploy/compose/docker-compose.yml
WEB := pnpm --filter @linklytics/web
API := pnpm --filter @linklytics/api

.DEFAULT_GOAL := help
.PHONY: help up down logs ps build seed test e2e lint typecheck k8s-up k8s-down clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Build + start the full stack (docker-compose), detached
	$(COMPOSE) up --build -d
	@echo "Web  -> http://localhost:3000"
	@echo "API  -> http://localhost:3001/healthz"

down: ## Stop the stack and remove volumes
	$(COMPOSE) down -v

logs: ## Tail stack logs
	$(COMPOSE) logs -f

obs-up: ## Start the stack + Prometheus + Grafana (http://localhost:3002, admin/admin)
	$(COMPOSE) -f deploy/compose/docker-compose.observability.yml up --build -d
	@echo "Grafana -> http://localhost:3002 (admin/admin)   Prometheus -> http://localhost:9090"

ps: ## Show stack status
	$(COMPOSE) ps

build: ## Build the images without starting
	$(COMPOSE) build

seed: ## Seed demo data (runs on the host against the compose DB)
	DATABASE_URL=postgresql://linklytics:linklytics@localhost:5434/linklytics?schema=public $(API) db:seed

lint: ## Lint both apps
	pnpm lint

typecheck: ## Typecheck both apps
	pnpm typecheck

test: ## Full gate: lint + typecheck + API tests + web e2e (brings the stack up)
	pnpm lint
	pnpm typecheck
	$(API) test
	$(COMPOSE) up --build -d
	$(WEB) exec playwright install chromium
	PLAYWRIGHT_BASE_URL=http://localhost:3000 $(WEB) test:e2e

e2e: ## Run the web Playwright e2e against a running stack
	$(WEB) test:e2e

k8s-up: ## Create kind cluster, build+load images, deploy overlays/local
	node scripts/k8s-up.mjs

k8s-down: ## Delete the kind cluster
	node scripts/k8s-down.mjs

clean: ## Remove build artifacts
	pnpm -r clean
