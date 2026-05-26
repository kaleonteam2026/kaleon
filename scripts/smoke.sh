#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-smoke-test-client}"
export OIDC_ISSUER_URL="${OIDC_ISSUER_URL:-https://example.com}"
export PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-http://localhost:19245}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:19245}"
export PRIVATE_OBJECT_DIR="${PRIVATE_OBJECT_DIR:-/smoke-bucket/private}"
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/pathwise_smoke}"
export PORT="${PORT:-18080}"
export NODE_ENV="${NODE_ENV:-development}"

API_DIST="artifacts/api-server/dist/index.mjs"
WEB_DIST="artifacts/pathwise-cc/dist/public/index.html"

if [ ! -f "$API_DIST" ]; then
  echo "smoke: building api-server..."
  pnpm --filter @workspace/api-server run build
fi

if [ ! -f "$WEB_DIST" ]; then
  echo "smoke: building pathwise-cc..."
  pnpm --filter @workspace/pathwise-cc run build
fi

node --enable-source-maps "$API_DIST" &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

i=0
while [ "$i" -lt 30 ]; do
  if curl -sf "http://127.0.0.1:${PORT}/api/healthz" >/dev/null 2>&1; then
    echo "smoke: API healthz OK"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "smoke: API health check failed on port ${PORT}" >&2
exit 1
