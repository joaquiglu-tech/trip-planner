#!/usr/bin/env bash
# SessionStart: print the latest progress note + git status so a fresh session re-orients.
set -euo pipefail
echo "=== Session orientation ==="
latest="$(ls -t docs/progress/*.md 2>/dev/null | head -n1 || true)"
if [ -n "${latest:-}" ]; then
  echo "--- Latest progress note ($latest) ---"
  tail -n 30 "$latest"
fi
echo "--- git status ---"
git status -s 2>/dev/null || true
git log --oneline -5 2>/dev/null || true
exit 0
