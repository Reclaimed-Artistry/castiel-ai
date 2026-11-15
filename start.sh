#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/user/castiel-ai"

if [ ! -f "$ROOT/data/catalog.json" ]; then
  python3 "$ROOT/backend/catalog.py"
fi

if [ ! -d "$ROOT/frontend/dist" ]; then
  cd "$ROOT/frontend"
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  npm run build
fi

export CASTIEL_PORT="${CASTIEL_PORT:-3000}"
exec python3 "$ROOT/backend/server.py"
