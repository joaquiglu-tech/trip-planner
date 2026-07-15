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

# --- Ensure the Superpowers plugin is available (phone-first, non-negotiable) ---
# Web/mobile sessions run in an ephemeral container and DON'T auto-install a
# repo's project-scoped `enabledPlugins`; the interactive /plugin and
# /reload-plugins commands don't exist there either. So the only reliable path
# on a phone is the non-interactive `claude plugin` CLI, run here every session.
# Best-effort: this must never fail session start (see `exit 0` below).
sp_id="superpowers@superpowers-marketplace"
sp_alert() {
  echo ""
  echo "############################################################"
  echo "## ⚠️  SUPERPOWERS NOT AVAILABLE — $1"
  echo "## The build workflow depends on it. Tell your human before"
  echo "## continuing. Manual bootstrap (CLI, not a slash command):"
  echo "##   claude plugin marketplace add obra/superpowers-marketplace"
  echo "##   claude plugin install $sp_id"
  echo "############################################################"
  echo ""
}
sp_run() { if command -v timeout >/dev/null 2>&1; then timeout 120 "$@"; else "$@"; fi; }

if ! command -v claude >/dev/null 2>&1; then
  sp_alert "'claude' CLI not found on PATH"
elif claude plugin list 2>/dev/null | grep -q "$sp_id"; then
  claude plugin enable "$sp_id" >/dev/null 2>&1 || true
  echo "Superpowers plugin: already installed."
else
  echo "--- Bootstrapping Superpowers plugin ---"
  sp_run claude plugin marketplace add obra/superpowers-marketplace >/dev/null 2>&1 || true
  if sp_run claude plugin install "$sp_id" >/dev/null 2>&1; then
    echo "Superpowers plugin installed."
  else
    sp_alert "install failed"
  fi
fi
# Confirm the skills actually landed on disk (installed != skills present).
if [ -n "$(find "$HOME/.claude/plugins" -type d -path '*superpowers*/skills/brainstorming' 2>/dev/null | head -n1)" ]; then
  echo "Superpowers skills present on disk. ✅"
else
  sp_alert "skills directory not found after install"
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
