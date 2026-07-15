#!/usr/bin/env bash
# SessionStart: install deps for a fresh clone, then print orientation.
set -euo pipefail
echo "=== Session orientation ==="

# Web/mobile sessions clone the repo WITHOUT node_modules, so the test/lint
# gates (and dev server) would fail until deps exist. Install them once, up
# front. Best-effort: this must never fail session start.
if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "--- Installing dependencies (fresh clone) ---"
  if npm ci --silent >/dev/null 2>&1; then
    echo "Dependencies installed (npm ci)."
  elif npm install --silent >/dev/null 2>&1; then
    echo "Dependencies installed (npm install fallback)."
  else
    echo "WARNING: dependency install failed — run 'npm install' before tests/build."
  fi
fi

latest="$(ls -t docs/progress/*.md 2>/dev/null | head -n1 || true)"
if [ -n "${latest:-}" ]; then
  echo "--- Latest progress note ($latest) ---"
  tail -n 30 "$latest"
fi
echo "--- git status ---"
git status -s 2>/dev/null || true
git log --oneline -5 2>/dev/null || true
exit 0
