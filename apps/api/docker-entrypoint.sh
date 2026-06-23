#!/bin/sh
set -e

cd /app/apps/api

echo "[entrypoint] Applying database migrations..."
pnpm exec prisma migrate deploy

echo "[entrypoint] Starting Linklytics API..."
exec node dist/main.js
