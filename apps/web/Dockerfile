# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Builder — install deps and produce the Next.js standalone server output.
# NEXT_PUBLIC_* vars are inlined at build time, so the API origin is a build arg.
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
ENV CI=true
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter "@linklytics/web..."

COPY apps/web ./apps/web
RUN pnpm --filter @linklytics/web build

# ----------------------------------------------------------------------------
# Runner — copy only the standalone server + static assets, non-root.
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Monorepo standalone output is laid out from the workspace root (apps/web/...).
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "apps/web/server.js"]
