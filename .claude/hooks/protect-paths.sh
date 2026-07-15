#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit): block edits to protected files.
# Exit code 2 = block the action and tell Claude why.
set -euo pipefail
payload="$(cat)"
# Extract the target path from the tool input (works for Edit/Write/MultiEdit).
path="$(printf '%s' "$payload" | grep -oE '"(file_path|path)"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/')"
case "$path" in
  *.env.example|*.env.sample)
    # Templates are safe to edit
    exit 0
    ;;
  *.env|*.env.*|*/secrets/*|*secret*|*/migrations/*)
    echo "BLOCKED: '$path' is protected. Do not hand-edit env files, secrets, or migrations. Generate migrations and review the SQL instead." >&2
    exit 2
    ;;
esac
exit 0
