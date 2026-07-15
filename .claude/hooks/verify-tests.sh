#!/usr/bin/env bash
# Stop hook: enforce "don't finish on a broken build". Exit 2 = keep Claude working.
#
# Runs the checks it CAN from a phone session (no browser / no Playwright):
#   1. typecheck  (npm run typecheck, if the script exists)
#   2. unit/integration tests (npm test, if the script exists)
# CI=true keeps runners (vitest/jest) in single-run mode instead of watch.
#
# Guard against infinite loops: if Claude is already responding to a Stop
# hook, let it stop. The second Stop always passes through.
set -euo pipefail
payload="$(cat)"
if printf '%s' "$payload" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# Nothing to check if there's no package.json.
[ -f package.json ] || exit 0

has_script() { grep -Eq "\"$1\"[[:space:]]*:" package.json 2>/dev/null; }

fail=0
if has_script typecheck; then
  if ! CI=true npm run typecheck --silent; then
    echo "BLOCKED: typecheck is failing. Fix the type errors before finishing." >&2
    fail=1
  fi
fi
if has_script test; then
  if ! CI=true npm test --silent; then
    echo "BLOCKED: tests are failing. Fix them (and add/maintain unit tests for changed functionality) before finishing." >&2
    fail=1
  fi
fi

[ "$fail" -eq 0 ] || exit 2
exit 0
