#!/usr/bin/env bash
# PreToolUse (Bash): block destructive commands. Exit 2 = block.
set -euo pipefail
payload="$(cat)"
cmd="$(printf '%s' "$payload" | grep -oE '"command"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' | head -n1 | sed -E 's/"command"[[:space:]]*:[[:space:]]*"(.*)"/\1/')"
# Patterns we never want run unattended.
if printf '%s' "$cmd" | grep -Eiq 'rm[[:space:]]+-rf[[:space:]]+/|rm[[:space:]]+-rf[[:space:]]+~|:>[[:space:]]*/|DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)|TRUNCATE|git[[:space:]]+push[[:space:]].*--force|git[[:space:]]+reset[[:space:]]+--hard|force-push'; then
  echo "BLOCKED: destructive command detected ('$cmd'). Ask for explicit human confirmation and run it manually if intended." >&2
  exit 2
fi
exit 0
