# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Builder — install all deps (incl. dev) and compile the Nest app to dist/.
# ----------------------------------------------------------------------------
FROM node:26-alpine AS builder
RUN npm install -g pnpm@10.34.4
WORKDIR /app
ENV CI=true

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# Schema must exist before install (api postinstall runs `prisma generate`).
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile --filter "@linklytics/api..."

COPY apps/api ./apps/api
RUN pnpm --filter @linklytics/api build

# ----------------------------------------------------------------------------
# Runner — production deps only + compiled output, non-root, self-migrating.
# node:20-alpine (not distroless) so the entrypoint can run `prisma migrate`.
# ----------------------------------------------------------------------------
FROM node:26-alpine AS runner
RUN npm install -g pnpm@10.34.4
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/api/prisma ./apps/api/prisma
# Generates the Prisma client + downloads the musl query engine for this image.
RUN pnpm install --frozen-lockfile --prod --filter "@linklytics/api..."

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/healthz >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/bin/sh", "/app/apps/api/docker-entrypoint.sh"]
