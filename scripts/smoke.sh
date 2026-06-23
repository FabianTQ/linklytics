#!/usr/bin/env bash
# End-to-end smoke test against a running deployment reachable at $BASE (default
# http://localhost, i.e. through the ingress). Used by the kind smoke job in CI
# and runnable locally after `make k8s-up`.
set -euo pipefail

BASE="${BASE:-http://localhost}"
JAR="$(mktemp)"
EMAIL="smoke_$$_$RANDOM@example.com"

fail() { echo "SMOKE FAILED: $1" >&2; exit 1; }

echo "1/5 web / returns 200"
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"
[ "$code" = "200" ] || fail "web / expected 200, got $code"

echo "2/5 register"
curl -fsS -c "$JAR" -X POST "$BASE/api/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" >/dev/null || fail "register failed"

echo "3/5 create link"
slug="$(curl -fsS -b "$JAR" -X POST "$BASE/api/links" \
  -H 'content-type: application/json' \
  -d '{"originalUrl":"https://example.com/ci-smoke"}' \
  | sed -E 's/.*"slug":"([^"]+)".*/\1/')"
[ -n "$slug" ] || fail "no slug returned"
echo "    slug=$slug"

echo "4/5 redirect /r/$slug returns 302 -> target"
result="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/r/$slug")"
echo "    $result"
echo "$result" | grep -q '^302 https://example.com/ci-smoke' || fail "redirect mismatch: $result"

echo "5/5 api /readyz is ready"
kubectl -n linklytics exec deploy/api -- wget -qO- http://127.0.0.1:3001/readyz \
  | grep -q '"status":"ready"' || fail "api /readyz not ready"

echo "SMOKE OK"
