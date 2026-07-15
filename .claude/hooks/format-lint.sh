#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): auto-format + lint-fix the touched file.
# Keep this FAST. Heavy checks (tests/typecheck) live in verify-tests.sh (Stop).
# NEVER fails the tool call — always exits 0. Formatting is best-effort.
set -euo pipefail
payload="$(cat)"
path="$(printf '%s' "$payload" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
[ -z "${path:-}" ] && exit 0
[ ! -f "$path" ] && exit 0

case "$path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.md)
    # Prettier if available (local bin preferred), then eslint --fix for code files.
    if [ -x node_modules/.bin/prettier ]; then
      node_modules/.bin/prettier --write "$path" >/dev/null 2>&1 || true
    elif command -v npx >/dev/null 2>&1; then
      npx --no-install prettier --write "$path" >/dev/null 2>&1 || true
    fi
    case "$path" in
      *.ts|*.tsx|*.js|*.jsx)
        if [ -x node_modules/.bin/eslint ]; then
          node_modules/.bin/eslint --fix "$path" >/dev/null 2>&1 || true
        fi
        ;;
    esac
    ;;
esac
exit 0
