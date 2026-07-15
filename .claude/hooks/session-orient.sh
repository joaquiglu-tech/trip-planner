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

# --- Verify the Superpowers skills are present (phone-first, non-negotiable) ---
# Superpowers is BUNDLED as repo files under .claude/skills/ (like the bmad-*
# skills), NOT installed as a plugin. Plugins live in the ephemeral ~/.claude
# and don't reliably load on fresh web/mobile sessions; repo .claude/skills/ is
# part of the git clone, so the harness loads it at every session start. This
# check just confirms the vendored folders are intact and alerts if not.
# Best-effort: never fails session start (see `exit 0` below).
missing=""
for s in using-superpowers brainstorming writing-plans test-driven-development \
         systematic-debugging requesting-code-review; do
  [ -f ".claude/skills/$s/SKILL.md" ] || missing="$missing $s"
done
if [ -z "$missing" ]; then
  echo "Superpowers skills bundled in .claude/skills/. ✅"
else
  echo ""
  echo "############################################################"
  echo "## ⚠️  SUPERPOWERS SKILLS MISSING FROM REPO:$missing"
  echo "## They are vendored under .claude/skills/ and must be part"
  echo "## of the clone. Restore them from git or re-vendor from"
  echo "## obra/superpowers-marketplace. Tell your human."
  echo "############################################################"
  echo ""
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
